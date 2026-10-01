/**
 * Products ordered by how many units can be sold right now, a page at a time.
 *
 * Sorting a product list by stock used to happen after the page was cut, so
 * "lowest stock first" only reordered the twenty rows already on screen. The
 * order has to be decided across every matching product before paging, and
 * stock lives here, not on the product row — so the ranking is done in SQL.
 *
 * The caller passes the ids of every product its filters matched; this
 * returns one page of them in stock order, with the figure it sorted by. Same
 * read-side join exception, and same "available" rule (quantity minus held,
 * active variants, every location) as `availabilityByProduct`, so the number
 * a row sorts by is the number it shows.
 */
import { Prisma } from "@prisma/client";
import { prisma } from "../../_shared/db";

export interface RankedAvailability {
  productId: string;
  available: number;
}

export async function rankProductsByAvailability(
  productIds: readonly string[],
  direction: "asc" | "desc",
  page: { skip: number; take: number } | null = null,
): Promise<RankedAvailability[]> {
  if (productIds.length === 0) return [];

  const ids = [...productIds];
  const order = direction === "asc" ? Prisma.sql`ASC` : Prisma.sql`DESC`;
  const limit = page ? Prisma.sql`LIMIT ${page.take} OFFSET ${page.skip}` : Prisma.empty;

  const rows = await prisma.$queryRaw<{ productId: string; available: bigint | null }[]>(
    Prisma.sql`
      SELECT p."id" AS "productId", COALESCE(a."available", 0) AS "available"
      FROM "products" p
      LEFT JOIN (
        SELECT v."productId", SUM(GREATEST(lvl."quantity" - lvl."reservedQuantity", 0)) AS "available"
        FROM "inventory_levels" lvl
        JOIN "product_variants" v ON v."id" = lvl."variantId"
        WHERE v."productId" = ANY(${ids}) AND v."isActive" = true
        GROUP BY v."productId"
      ) a ON a."productId" = p."id"
      WHERE p."id" = ANY(${ids})
      -- Ties fall back to the list's usual newest-first order, so a page
      -- boundary never shuffles rows between requests.
      ORDER BY COALESCE(a."available", 0) ${order}, p."createdAt" DESC, p."id" ASC
      ${limit}
    `,
  );

  return rows.map((r) => ({ productId: r.productId, available: Number(r.available ?? 0) }));
}
