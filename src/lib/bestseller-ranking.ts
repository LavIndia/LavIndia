/**
 * How many units each product has sold, to date.
 *
 * Computed ONCE and cached. Counting order items is an aggregate over the
 * whole order history, and it changes only when an order is placed — so
 * recomputing it on every storefront request would be the most wasteful
 * query in the application, growing more expensive the better the shop does.
 *
 * The cache is invalidated precisely, by `revalidateTag("bestsellers")` at
 * the point an order is created, with a short revalidate window as a safety
 * net. This is the same tag-based pattern used by `homepage-data.ts` and
 * `category-data.ts`.
 *
 * One fetch, many readers: the rail, the "Bestseller" badge and any future
 * ranking all read this single result rather than each running their own
 * count.
 */
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

export const BESTSELLERS_TAG = "bestsellers";

export interface BestsellerEntry {
  productId: string;
  /** Units sold, not order count — two of one item is two units. */
  unitsSold: number;
  /** Number of distinct orders the product appears in. */
  orderCount: number;
}

async function computeRanking(): Promise<BestsellerEntry[]> {
  // Cancelled orders are excluded: an order that never completed is not a
  // sale, and counting it would let an abandoned checkout promote a product.
  const rows = await prisma.orderItem.groupBy({
    by: ["productId"],
    where: { order: { status: { not: "CANCELLED" } } },
    _sum: { quantity: true },
    _count: { _all: true },
  });

  return rows
    .map((row) => ({
      productId: row.productId,
      unitsSold: row._sum.quantity ?? 0,
      orderCount: row._count._all,
    }))
    .sort((a, b) => b.unitsSold - a.unitsSold || b.orderCount - a.orderCount);
}

/**
 * The ranking, best-selling first. Served from cache between orders.
 */
export const getBestsellerRanking = unstable_cache(computeRanking, ["bestseller-ranking"], {
  tags: [BESTSELLERS_TAG],
  revalidate: 300,
});

/**
 * The same ranking keyed by product id, for callers that already hold a list
 * of products and just need each one's figure — so a page that has both a
 * rail and badges resolves them from one result instead of two queries.
 */
export async function getBestsellerMap(): Promise<Map<string, BestsellerEntry>> {
  const ranking = await getBestsellerRanking();
  return new Map(ranking.map((entry) => [entry.productId, entry]));
}
