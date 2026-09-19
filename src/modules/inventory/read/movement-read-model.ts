/**
 * Read model for Admin > Inventory > Movements.
 *
 * The movement ledger is immutable: this file only ever reads. Like the
 * stock read model it joins catalog rows to render a recognisable line, and
 * the same containment rule applies — read side only, DTO out, one file to
 * change when Inventory is split into its own service.
 */
import { Prisma, type InventoryMovementType } from "@prisma/client";
import { prisma } from "../../_shared/db";
import type { LocationId as LocationIdType, VariantId as VariantIdType } from "../../_shared/ids";

export interface MovementRow {
  id: string;
  createdAt: Date;
  type: InventoryMovementType;
  quantity: number;
  beforeQuantity: number;
  afterQuantity: number;
  productName: string;
  variantName: string;
  sku: string | null;
  barcode: string | null;
  locationName: string;
  referenceType: string | null;
  referenceId: string | null;
  /** The order number when the reference is an order, so the UI need not look it up. */
  referenceLabel: string | null;
  reason: string | null;
  createdBy: string | null;
  createdByName: string | null;
}

export interface MovementQuery {
  search?: string;
  variantId?: VariantIdType;
  locationId?: LocationIdType;
  type?: InventoryMovementType | "ALL";
  page?: number;
  pageSize?: number;
}

export interface MovementPage {
  rows: MovementRow[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export const MOVEMENTS_PAGE_SIZE = 50;

type RawMovementRow = Omit<MovementRow, "createdByName" | "referenceLabel"> & {
  createdByName: string | null;
  referenceLabel: string | null;
  totalCount: bigint;
};

/**
 * One query for the page, its total, the catalog labels, the acting user's
 * name and the referenced order number. Each of those as a separate lookup
 * would turn one screen into five round trips plus an N+1 per row.
 */
export async function queryMovements(query: MovementQuery): Promise<MovementPage> {
  const page = Math.max(1, query.page ?? 1);
  const pageSize = query.pageSize ?? MOVEMENTS_PAGE_SIZE;
  const offset = (page - 1) * pageSize;

  const conditions: Prisma.Sql[] = [];

  if (query.variantId) conditions.push(Prisma.sql`m."variantId" = ${query.variantId}`);
  if (query.locationId) conditions.push(Prisma.sql`m."locationId" = ${query.locationId}`);
  if (query.type && query.type !== "ALL") {
    conditions.push(Prisma.sql`m."type" = ${query.type}::"InventoryMovementType"`);
  }

  const search = query.search?.trim();
  if (search) {
    const like = `%${search}%`;
    conditions.push(Prisma.sql`(
      v."barcode" = ${search}
      OR v."sku" = ${search}
      OR p."name" ILIKE ${like}
      OR o."orderNumber" ILIKE ${like}
    )`);
  }

  const where = conditions.length
    ? Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`
    : Prisma.empty;

  const rows = await prisma.$queryRaw<RawMovementRow[]>(Prisma.sql`
    SELECT
      m."id"              AS "id",
      m."createdAt"       AS "createdAt",
      m."type"            AS "type",
      m."quantity"        AS "quantity",
      m."beforeQuantity"  AS "beforeQuantity",
      m."afterQuantity"   AS "afterQuantity",
      p."name"            AS "productName",
      v."name"            AS "variantName",
      v."sku"             AS "sku",
      v."barcode"         AS "barcode",
      loc."name"          AS "locationName",
      m."referenceType"   AS "referenceType",
      m."referenceId"     AS "referenceId",
      o."orderNumber"     AS "referenceLabel",
      m."reason"          AS "reason",
      m."createdBy"       AS "createdBy",
      u."name"            AS "createdByName",
      COUNT(*) OVER()     AS "totalCount"
    FROM "inventory_movements" m
    JOIN "product_variants" v ON v."id" = m."variantId"
    JOIN "products" p ON p."id" = v."productId"
    JOIN "inventory_locations" loc ON loc."id" = m."locationId"
    LEFT JOIN "orders" o ON m."referenceType" = 'ORDER' AND o."id" = m."referenceId"
    LEFT JOIN "users" u ON u."id" = m."createdBy"
    ${where}
    ORDER BY m."createdAt" DESC
    LIMIT ${pageSize} OFFSET ${offset}
  `);

  const totalCount = rows.length > 0 ? Number(rows[0].totalCount) : 0;

  return {
    rows: rows.map(({ totalCount: _ignored, ...row }) => row),
    page,
    pageSize,
    totalCount,
    totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
  };
}
