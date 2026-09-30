/**
 * Reading and writing promotions. The engine never touches the database;
 * this file is where the module does.
 */
import { prisma, type Tx } from "../_shared/db";
import { DomainError } from "../_shared/errors";
import type { EnginePromotion } from "./contracts";
import { toEnginePromotion, type PromotionRow } from "./mapping";

export const PROMOTION_INCLUDE = { codes: { select: { code: true } } } as const;

/**
 * Every promotion that could apply now or later today: activated, not
 * paused, not archived, not past its end, not used up.
 *
 * Offers that start later are included on purpose — the engine checks the
 * schedule itself — so a cached copy of this list is still right the moment
 * an offer's start time passes.
 */
export async function findActivePromotionRows(now = new Date()): Promise<PromotionRow[]> {
  const rows = await prisma.promotion.findMany({
    where: {
      archivedAt: null,
      isPaused: false,
      activatedAt: { not: null },
      OR: [{ endsAt: null }, { endsAt: { gt: now } }],
    },
    include: PROMOTION_INCLUDE,
    orderBy: { createdAt: "asc" },
  });
  return rows.filter(
    (row) =>
      (row.usageLimit === null || row.usedCount < row.usageLimit) &&
      (row.budgetCents === null || row.discountGivenCents < row.budgetCents),
  );
}

export function toEnginePromotions(rows: readonly PromotionRow[]): EnginePromotion[] {
  return rows.map(toEnginePromotion).filter((p): p is EnginePromotion => p !== null);
}

export interface CustomerFacts {
  previousOrderCount: number;
  /** Orders per promotion this client has already used it on. */
  usage: Map<string, number>;
}

/**
 * What the engine needs to know about the client — fetched only when a live
 * offer actually asks about it, so an ordinary cart costs no extra query.
 */
export async function customerFacts(
  customerId: string | null,
  rows: readonly PromotionRow[],
): Promise<CustomerFacts> {
  const facts: CustomerFacts = { previousOrderCount: 0, usage: new Map() };
  if (!customerId) return facts;

  const needsHistory = rows.some((row) =>
    JSON.stringify(row.conditions).includes("firstOrderOnly"),
  );
  const limited = rows.filter((row) => row.perCustomerLimit !== null).map((row) => row.id);

  const [count, usage] = await Promise.all([
    needsHistory
      ? prisma.order.count({ where: { userId: customerId, status: { not: "CANCELLED" } } })
      : Promise.resolve(0),
    limited.length
      ? prisma.$queryRaw<Array<{ promotionId: string; orders: bigint }>>`
          SELECT a."promotionId", COUNT(DISTINCT a."orderId") AS orders
            FROM "promotion_allocations" a
            JOIN "orders" o ON o."id" = a."orderId"
           WHERE o."userId" = ${customerId}
             AND o."status" <> 'CANCELLED'
             AND a."promotionId" = ANY(${limited})
           GROUP BY a."promotionId"`
      : Promise.resolve([]),
  ]);

  facts.previousOrderCount = count;
  for (const row of usage) facts.usage.set(row.promotionId, Number(row.orders));
  return facts;
}

/** Drops offers this client has already used as often as allowed. */
export function withinCustomerLimits(
  rows: readonly PromotionRow[],
  facts: CustomerFacts,
): PromotionRow[] {
  return rows.filter(
    (row) => row.perCustomerLimit === null || (facts.usage.get(row.id) ?? 0) < row.perCustomerLimit,
  );
}

export interface RedemptionLine {
  orderItemId: string;
  allocations: Array<{
    promotionId: string;
    label: string;
    code: string | null;
    applicationKey: string;
    cents: number;
  }>;
}

/**
 * Records what an order received, and counts it against each offer's limits,
 * inside the order's own transaction.
 *
 * The counters are guarded in SQL, so two clients racing for the last use
 * of a limited offer cannot both have it: the second update matches no row
 * and the second order fails with a clear message rather than overspending
 * the offer.
 */
export async function recordRedemption(
  tx: Tx,
  orderId: string,
  lines: readonly RedemptionLine[],
  applied: ReadonlyArray<{ promotionId: string; code: string | null; savingCents: number }>,
): Promise<void> {
  const allocations = lines.flatMap((line) =>
    line.allocations
      .filter((a) => a.cents > 0)
      .map((a) => ({
        orderId,
        orderItemId: line.orderItemId,
        promotionId: a.promotionId,
        code: a.code,
        label: a.label,
        applicationKey: a.applicationKey,
        amountCents: a.cents,
      })),
  );
  if (allocations.length) await tx.promotionAllocation.createMany({ data: allocations });

  for (const offer of applied) {
    const updated = await tx.$executeRaw`
      UPDATE "promotions"
         SET "usedCount" = "usedCount" + 1,
             "discountGivenCents" = "discountGivenCents" + ${offer.savingCents},
             "updatedAt" = now()
       WHERE "id" = ${offer.promotionId}
         AND ("usageLimit" IS NULL OR "usedCount" < "usageLimit")
         AND ("budgetCents" IS NULL OR "discountGivenCents" < "budgetCents")`;
    if (updated === 0) {
      throw new DomainError("CONFLICT", "An offer in this order has just run out. Please review your cart.", {
        promotionId: offer.promotionId,
      });
    }
    if (offer.code) {
      const codeUpdated = await tx.$executeRaw`
        UPDATE "promotion_codes"
           SET "usedCount" = "usedCount" + 1
         WHERE "code" = ${offer.code}
           AND ("usageLimit" IS NULL OR "usedCount" < "usageLimit")`;
      if (codeUpdated === 0) {
        throw new DomainError("CONFLICT", `The code ${offer.code} has reached its limit.`);
      }
    }
  }
}
