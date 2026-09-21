import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { availabilityByProduct } from "@/modules/inventory";
import {
  DEFAULT_PRODUCT_STRATEGIES,
  RECOMMENDATION_COPY,
  type RecommendationRail,
  type RecommendationRequest,
  type RecommendationStrategy,
  type RecommendedProduct,
} from "@/modules/catalog/recommendations/recommendation-types";

/**
 * Builds recommendation rails for a product.
 *
 * The shape of the work is deliberate. Each strategy only decides *which ids*
 * it wants and in what order; the products behind those ids are then loaded
 * once, for the union of every rail, and stock once more for that same union.
 * So three rails cost one id query per behavioural strategy plus two shared
 * reads, not three full product fetches — the same discipline the homepage
 * rails follow.
 *
 * Rails are also made disjoint: a product already shown above is not repeated
 * lower down, because three rows of the same six pieces reads as a bug.
 */

const DEFAULT_LIMIT = 8;

const PRODUCT_SELECT = {
  id: true,
  name: true,
  slug: true,
  description: true,
  priceCents: true,
  compareAtCents: true,
  isFeatured: true,
  isLimitedEdition: true,
  categoryId: true,
  images: {
    orderBy: [{ isPrimary: "desc" }, { position: "asc" }] as const,
    take: 2,
    select: { url: true, alt: true },
  },
} satisfies Prisma.ProductSelect;

type ProductRow = Prisma.ProductGetPayload<{ select: typeof PRODUCT_SELECT }>;

const LIVE = { isActive: true, isPublished: true } as const;

/**
 * Ids of products bought in the same orders as this one, most co-purchased
 * first. Two grouped reads over order lines, no product join.
 */
async function coPurchasedIds(productId: string, limit: number): Promise<string[]> {
  const orderIds = (
    await prisma.orderItem.findMany({
      where: { productId },
      select: { orderId: true },
      distinct: ["orderId"],
      // A seed with a long sales history does not need every order of it to
      // establish what goes with it; the most recent ones are also the most
      // representative of what is being bought now.
      orderBy: { id: "desc" },
      take: 200,
    })
  ).map((row) => row.orderId);

  if (orderIds.length === 0) return [];

  const grouped = await prisma.orderItem.groupBy({
    by: ["productId"],
    where: { orderId: { in: orderIds }, productId: { not: productId } },
    _count: { productId: true },
    orderBy: { _count: { productId: "desc" } },
    take: limit * 2,
  });

  return grouped.map((row) => row.productId);
}

/**
 * Ids of the closest pieces in the same category by price.
 *
 * Closeness is measured on price rather than on a name match because within
 * one category price is the axis a customer is actually choosing along, and
 * it needs no text analysis to be meaningful.
 */
async function similarIds(
  seed: { id: string; categoryId: string; priceCents: number },
  limit: number,
): Promise<string[]> {
  const rows = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT p."id"
    FROM "products" p
    WHERE p."categoryId" = ${seed.categoryId}
      AND p."id" <> ${seed.id}
      AND p."isActive" = true
      AND p."isPublished" = true
    ORDER BY ABS(p."priceCents" - ${seed.priceCents}) ASC, p."createdAt" DESC
    LIMIT ${limit * 2}
  `;
  return rows.map((row) => row.id);
}

/** Ids of the best-selling products overall, newest first when nothing sells. */
async function popularIds(excludeId: string, limit: number): Promise<string[]> {
  const rows = await prisma.product.findMany({
    where: { ...LIVE, id: { not: excludeId } },
    select: { id: true },
    orderBy: [{ orderItems: { _count: "desc" } }, { createdAt: "desc" }],
    take: limit * 3,
  });
  return rows.map((row) => row.id);
}

/** Turns loaded rows plus stock into the rail DTO, preserving a given order. */
function toRecommended(
  ids: string[],
  rows: Map<string, ProductRow>,
  stock: Map<string, { available: number }>,
): RecommendedProduct[] {
  return ids.flatMap((id) => {
    const row = rows.get(id);
    if (!row) return [];
    return [
      {
        id: row.id,
        name: row.name,
        slug: row.slug,
        description: row.description,
        priceCents: row.priceCents,
        compareAtCents: row.compareAtCents,
        stock: stock.get(row.id)?.available ?? 0,
        isFeatured: row.isFeatured,
        isLimitedEdition: row.isLimitedEdition,
        images: row.images.map((image) => ({
          url: image.url,
          alt: image.alt || row.name,
        })),
      },
    ];
  });
}

export async function getRecommendations({
  productId,
  strategies = DEFAULT_PRODUCT_STRATEGIES,
  limit = DEFAULT_LIMIT,
}: RecommendationRequest): Promise<RecommendationRail[]> {
  const seed = await prisma.product.findFirst({
    where: { OR: [{ id: productId }, { slug: productId }] },
    select: { id: true, categoryId: true, priceCents: true },
  });
  if (!seed) return [];

  // Candidate ids per strategy, gathered in parallel.
  const candidates = new Map<RecommendationStrategy, string[]>();
  await Promise.all(
    strategies.map(async (strategy) => {
      if (strategy === "bought_together") {
        candidates.set(strategy, await coPurchasedIds(seed.id, limit));
      } else if (strategy === "similar") {
        candidates.set(strategy, await similarIds(seed, limit));
      } else {
        candidates.set(strategy, await popularIds(seed.id, limit));
      }
    }),
  );

  // Claim ids rail by rail so no product appears twice down the page, and
  // so the shared reads below cover exactly what will be rendered.
  const claimed = new Set<string>([seed.id]);
  const perRail = new Map<RecommendationStrategy, string[]>();
  for (const strategy of strategies) {
    const taken: string[] = [];
    for (const id of candidates.get(strategy) ?? []) {
      if (claimed.has(id) || taken.length >= limit) continue;
      taken.push(id);
      claimed.add(id);
    }
    perRail.set(strategy, taken);
  }

  const wanted = [...new Set([...perRail.values()].flat())];
  if (wanted.length === 0) return [];

  // The two shared reads: the products, and their sellable stock.
  const [rows, stock] = await Promise.all([
    prisma.product.findMany({ where: { id: { in: wanted }, ...LIVE }, select: PRODUCT_SELECT }),
    availabilityByProduct(wanted),
  ]);
  const byId = new Map(rows.map((row) => [row.id, row]));

  // A rail with nothing in it is dropped rather than shown empty: a heading
  // over a blank strip looks broken, and an unsold new product legitimately
  // has no co-purchase history at all.
  return strategies
    .map((strategy) => ({
      strategy,
      ...RECOMMENDATION_COPY[strategy],
      products: toRecommended(perRail.get(strategy) ?? [], byId, stock),
    }))
    .filter((rail) => rail.products.length > 0);
}
