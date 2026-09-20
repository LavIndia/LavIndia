/**
 * Read model for Admin > Inventory > Stock.
 *
 * This is a deliberate, documented exception to "domains do not read each
 * other's tables". The stock screen has to show a line an operator can
 * recognise — product name, variant, SKU, barcode — next to the numbers
 * Inventory owns, and resolving those through the Catalog contract row by
 * row would be an N+1 waterfall on the single busiest screen in the admin.
 *
 * The exception is contained to the READ side and to this file: nothing here
 * writes, and the DTO it returns is the only shape the UI sees. When
 * Inventory is split out into its own service, this join is replaced by a
 * `catalogService.findVariantsByIds` call over the page of variant ids —
 * a change confined to this file.
 */
import { Prisma } from "@prisma/client";
import { prisma } from "../../_shared/db";
import { Barcode, LocationId, ProductId, Sku, VariantId } from "../../_shared/ids";
import type { LocationId as LocationIdType } from "../../_shared/ids";

/** How a stock line reads at a glance, derived rather than stored. */
export type StockStatus = "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";

/**
 * Fallback reorder point, used only where a variant has not set its own.
 *
 * Each variant carries a `reorderPoint`, because "running low" is not one
 * number: three is sensible for an everyday stud and far too late for a piece
 * that sells one a month.
 */
export const LOW_STOCK_THRESHOLD = 3;

export interface StockRow {
  variantId: string;
  productId: string;
  productName: string;
  productSlug: string;
  variantName: string;
  isDefaultVariant: boolean;
  sku: string | null;
  barcode: string | null;
  /** The level at or below which this line is flagged Low stock. */
  reorderPoint: number;
  imageUrl: string | null;
  priceCents: number;
  locationId: string;
  locationName: string;
  quantity: number;
  reservedQuantity: number;
  available: number;
  status: StockStatus;
}

export interface StockQuery {
  /** Matched against product name, variant name, SKU and barcode. */
  search?: string;
  locationId?: LocationIdType;
  status?: StockStatus | "ALL";
  page?: number;
  pageSize?: number;
}

export interface StockPage {
  rows: StockRow[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export const STOCK_PAGE_SIZE = 25;

function statusFor(available: number, reorderPoint: number): StockStatus {
  if (available <= 0) return "OUT_OF_STOCK";
  if (available <= reorderPoint) return "LOW_STOCK";
  return "IN_STOCK";
}

/**
 * Status is derived from `quantity - reservedQuantity`, so it has to be
 * filtered in SQL rather than after paging — otherwise a page of 25 could
 * come back with three rows once the filter is applied.
 */
function statusCondition(status: StockStatus): Prisma.Sql {
  switch (status) {
    case "OUT_OF_STOCK":
      return Prisma.sql`(lvl."quantity" - lvl."reservedQuantity") <= 0`;
    case "LOW_STOCK":
      return Prisma.sql`(lvl."quantity" - lvl."reservedQuantity") > 0 AND (lvl."quantity" - lvl."reservedQuantity") <= v."reorderPoint"`;
    case "IN_STOCK":
      return Prisma.sql`(lvl."quantity" - lvl."reservedQuantity") > v."reorderPoint"`;
  }
}

type RawStockRow = {
  variantId: string;
  productId: string;
  productName: string;
  productSlug: string;
  variantName: string;
  isDefaultVariant: boolean;
  sku: string | null;
  barcode: string | null;
  /** The level at or below which this line is flagged Low stock. */
  reorderPoint: number;
  imageUrl: string | null;
  priceCents: number;
  locationId: string;
  locationName: string;
  quantity: number;
  reservedQuantity: number;
  totalCount: bigint;
};

/**
 * One query returns the page and its total count together, via a window
 * function. Two round trips for one table is a waste when the filters are
 * identical, and it also removes any chance of the count disagreeing with
 * the rows because something changed between the two queries.
 */
export async function queryStock(query: StockQuery): Promise<StockPage> {
  const page = Math.max(1, query.page ?? 1);
  const pageSize = query.pageSize ?? STOCK_PAGE_SIZE;
  const offset = (page - 1) * pageSize;

  const conditions: Prisma.Sql[] = [];

  if (query.locationId) {
    conditions.push(Prisma.sql`lvl."locationId" = ${query.locationId}`);
  }

  if (query.status && query.status !== "ALL") {
    conditions.push(statusCondition(query.status));
  }

  const search = query.search?.trim();
  if (search) {
    // An exact match on either identifier wins outright — a scanned barcode
    // should land on one row, not everything sharing a word with it.
    const like = `%${search}%`;
    conditions.push(Prisma.sql`(
      v."barcode" = ${search}
      OR v."sku" = ${search}
      OR p."name" ILIKE ${like}
      OR v."name" ILIKE ${like}
      OR v."sku" ILIKE ${like}
    )`);
  }

  const where = conditions.length
    ? Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`
    : Prisma.empty;

  const rows = await prisma.$queryRaw<RawStockRow[]>(Prisma.sql`
    SELECT
      v."id"          AS "variantId",
      p."id"          AS "productId",
      p."name"        AS "productName",
      p."slug"        AS "productSlug",
      v."name"        AS "variantName",
      v."isDefault"   AS "isDefaultVariant",
      v."sku"         AS "sku",
      v."barcode"     AS "barcode",
      v."reorderPoint" AS "reorderPoint",
      COALESCE(v."priceCents", p."priceCents") AS "priceCents",
      loc."id"        AS "locationId",
      loc."name"      AS "locationName",
      lvl."quantity"  AS "quantity",
      lvl."reservedQuantity" AS "reservedQuantity",
      (
        -- The variant's own option-value group first (Colour: Gold for a
        -- Gold variant), then the product's general images. Same rule as
        -- src/modules/catalog/images/image-groups.ts, expressed in SQL.
        SELECT img."url" FROM "product_images" img
         WHERE img."productId" = p."id"
           AND (
             img."optionDimension" IS NULL
             OR (img."optionDimension" = 'color'    AND lower(img."optionValue") = lower(v."color"))
             OR (img."optionDimension" = 'size'     AND lower(img."optionValue") = lower(v."size"))
             OR (img."optionDimension" = 'material' AND lower(img."optionValue") = lower(v."material"))
           )
         ORDER BY (img."optionDimension" IS NOT NULL) DESC, img."isPrimary" DESC, img."position" ASC
         LIMIT 1
      ) AS "imageUrl",
      COUNT(*) OVER() AS "totalCount"
    FROM "inventory_levels" lvl
    JOIN "product_variants" v ON v."id" = lvl."variantId"
    JOIN "products" p ON p."id" = v."productId"
    JOIN "inventory_locations" loc ON loc."id" = lvl."locationId"
    ${where}
    ORDER BY p."name" ASC, v."position" ASC, v."name" ASC
    LIMIT ${pageSize} OFFSET ${offset}
  `);

  const totalCount = rows.length > 0 ? Number(rows[0].totalCount) : 0;

  return {
    rows: rows.map((row) => {
      const available = row.quantity - row.reservedQuantity;
      return {
        variantId: VariantId(row.variantId),
        productId: ProductId(row.productId),
        productName: row.productName,
        productSlug: row.productSlug,
        variantName: row.variantName,
        isDefaultVariant: row.isDefaultVariant,
        sku: row.sku ? Sku(row.sku) : null,
        barcode: row.barcode ? Barcode(row.barcode) : null,
        reorderPoint: row.reorderPoint,
        imageUrl: row.imageUrl,
        priceCents: row.priceCents,
        locationId: LocationId(row.locationId),
        locationName: row.locationName,
        quantity: row.quantity,
        reservedQuantity: row.reservedQuantity,
        available,
        status: statusFor(available, row.reorderPoint),
      };
    }),
    page,
    pageSize,
    totalCount,
    totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
  };
}

/**
 * Headline counts for the top of the stock screen. A single grouped query
 * rather than three filtered counts.
 */
export async function queryStockSummary(
  locationId?: LocationIdType,
): Promise<{ inStock: number; lowStock: number; outOfStock: number; totalUnits: number }> {
  const where = locationId
    ? Prisma.sql`WHERE lvl."locationId" = ${locationId}`
    : Prisma.empty;

  const [summary] = await prisma.$queryRaw<
    { inStock: bigint; lowStock: bigint; outOfStock: bigint; totalUnits: bigint | null }[]
  >(Prisma.sql`
    SELECT
      COUNT(*) FILTER (WHERE (lvl."quantity" - lvl."reservedQuantity") > v."reorderPoint") AS "inStock",
      COUNT(*) FILTER (WHERE (lvl."quantity" - lvl."reservedQuantity") > 0
                         AND (lvl."quantity" - lvl."reservedQuantity") <= v."reorderPoint") AS "lowStock",
      COUNT(*) FILTER (WHERE (lvl."quantity" - lvl."reservedQuantity") <= 0) AS "outOfStock",
      SUM(lvl."quantity") AS "totalUnits"
    FROM "inventory_levels" lvl
    JOIN "product_variants" v ON v."id" = lvl."variantId"
    ${where}
  `);

  return {
    inStock: Number(summary?.inStock ?? 0),
    lowStock: Number(summary?.lowStock ?? 0),
    outOfStock: Number(summary?.outOfStock ?? 0),
    totalUnits: Number(summary?.totalUnits ?? 0),
  };
}
