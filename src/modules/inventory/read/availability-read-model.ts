/**
 * Storefront availability.
 *
 * The storefront needs one number per product — "can this be bought right
 * now" — rolled up across that product's sellable variants. Before this
 * existed, every read path used the deprecated `Product.stock` column, which
 * the Inventory domain no longer maintains, so a fully stocked product
 * displayed as out of stock.
 *
 * Like the other read models here this joins catalog tables, which is the
 * documented read-side exception to the module boundary: it keeps a product
 * listing to a single extra query instead of an N+1 walk, and a future
 * service split replaces the join with a batched Inventory lookup without
 * touching any caller.
 */
import { Prisma } from "@prisma/client";
import { prisma } from "../../_shared/db";
import type { LocationId } from "../../_shared/ids";

export interface ProductAvailability {
  /** Sellable units across every active variant: quantity minus held. */
  available: number;
  /** Units physically present, including those held for in-flight orders. */
  onHand: number;
}

/**
 * Availability for many products in ONE query, keyed by product id.
 *
 * Batch by design: a category page or homepage rail resolves its whole grid
 * in a single round trip. A product with no stock row at all is reported as
 * a real zero rather than a missing key, so callers never have to decide
 * what absence means.
 */
export async function availabilityByProduct(
  productIds: readonly string[],
  options: { locationId?: LocationId } = {},
): Promise<Map<string, ProductAvailability>> {
  const result = new Map<string, ProductAvailability>();
  if (productIds.length === 0) return result;

  const locationFilter = options.locationId
    ? Prisma.sql`AND lvl."locationId" = ${options.locationId}`
    : Prisma.empty;

  const rows = await prisma.$queryRaw<
    { productId: string; available: bigint | null; onHand: bigint | null }[]
  >(Prisma.sql`
    SELECT
      v."productId" AS "productId",
      SUM(GREATEST(lvl."quantity" - lvl."reservedQuantity", 0)) AS "available",
      SUM(lvl."quantity") AS "onHand"
    FROM "inventory_levels" lvl
    JOIN "product_variants" v ON v."id" = lvl."variantId"
    WHERE v."productId" IN (${Prisma.join([...productIds])})
      AND v."isActive" = true
      ${locationFilter}
    GROUP BY v."productId"
  `);

  for (const row of rows) {
    result.set(row.productId, {
      available: Number(row.available ?? 0),
      onHand: Number(row.onHand ?? 0),
    });
  }

  for (const productId of productIds) {
    if (!result.has(productId)) result.set(productId, { available: 0, onHand: 0 });
  }

  return result;
}

/**
 * Availability per variant, for a product page where each option shows its
 * own stock. One query for the whole product.
 */
export async function availabilityByVariant(
  variantIds: readonly string[],
  options: { locationId?: LocationId } = {},
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (variantIds.length === 0) return result;

  const rows = await prisma.inventoryLevel.findMany({
    where: {
      variantId: { in: [...variantIds] },
      ...(options.locationId ? { locationId: options.locationId } : {}),
    },
    select: { variantId: true, quantity: true, reservedQuantity: true },
  });

  for (const row of rows) {
    const available = Math.max(row.quantity - row.reservedQuantity, 0);
    // Summed rather than assigned: a variant may be stocked at more than one
    // location, and the storefront sells from all of them.
    result.set(row.variantId, (result.get(row.variantId) ?? 0) + available);
  }

  for (const variantId of variantIds) {
    if (!result.has(variantId)) result.set(variantId, 0);
  }

  return result;
}
