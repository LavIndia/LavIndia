/**
 * The one place an inventory level is ever changed.
 *
 * Every mutation is a single conditional UPDATE that both applies the change
 * and enforces the business guard in the same statement:
 *
 *     UPDATE ... SET quantity = quantity - n
 *      WHERE quantity - reservedQuantity >= n
 *
 * That is what makes "two people sell the last item" safe. Postgres takes a
 * row lock for the UPDATE, and when the second writer is unblocked it
 * re-evaluates the WHERE clause against the row the first writer committed.
 * Exactly one of the two therefore matches and succeeds; the other affects
 * zero rows and is reported as insufficient stock.
 *
 * Doing it this way rather than read-then-write means no SELECT ... FOR
 * UPDATE round trip and no serializable-retry loop on the hot path, which
 * keeps checkout latency down.
 */
import { Prisma } from "@prisma/client";
import type { Tx } from "../../_shared/db";

export interface LevelMutation {
  variantId: string;
  locationId: string;
  /** Added to `quantity`. Negative to consume stock. */
  deltaQuantity: number;
  /** Added to `reservedQuantity`. Negative to release a hold. */
  deltaReserved: number;
  /**
   * Require at least this much sellable stock (quantity - reserved) before
   * applying. Used by every operation that takes stock out of the pool.
   */
  requireAvailable: number;
  /** Require at least this much already reserved. Used by release and by a sale that consumes a hold. */
  requireReserved: number;
}

export interface LevelMutationResult {
  beforeQuantity: number;
  afterQuantity: number;
  beforeReserved: number;
  afterReserved: number;
}

/**
 * Makes sure a level row exists before an increment. Only called for
 * operations that add stock — a sale must never quietly create a level row
 * for a variant that was never stocked.
 */
async function ensureLevelRow(tx: Tx, variantId: string, locationId: string): Promise<void> {
  await tx.$executeRaw`
    INSERT INTO "inventory_levels" ("id", "variantId", "locationId", "quantity", "reservedQuantity", "createdAt", "updatedAt")
    VALUES (gen_random_uuid()::text, ${variantId}, ${locationId}, 0, 0, NOW(), NOW())
    ON CONFLICT ("variantId", "locationId") DO NOTHING
  `;
}

/**
 * Applies one mutation atomically.
 *
 * Returns null when the guard was not met — the caller turns that into a
 * specific business error. Never throws for a business condition, and never
 * leaves a partially applied change.
 */
export async function mutateLevel(
  tx: Tx,
  mutation: LevelMutation,
): Promise<LevelMutationResult | null> {
  const addsStock = mutation.deltaQuantity > 0;
  if (addsStock) {
    await ensureLevelRow(tx, mutation.variantId, mutation.locationId);
  }

  const rows = await tx.$queryRaw<{ quantity: number; reservedQuantity: number }[]>(Prisma.sql`
    UPDATE "inventory_levels"
       SET "quantity" = "quantity" + ${mutation.deltaQuantity},
           "reservedQuantity" = "reservedQuantity" + ${mutation.deltaReserved},
           "updatedAt" = NOW()
     WHERE "variantId" = ${mutation.variantId}
       AND "locationId" = ${mutation.locationId}
       AND ("quantity" - "reservedQuantity") >= ${mutation.requireAvailable}
       AND "reservedQuantity" >= ${mutation.requireReserved}
    RETURNING "quantity", "reservedQuantity"
  `);

  const updated = rows[0];
  if (!updated) return null;

  return {
    afterQuantity: updated.quantity,
    afterReserved: updated.reservedQuantity,
    beforeQuantity: updated.quantity - mutation.deltaQuantity,
    beforeReserved: updated.reservedQuantity - mutation.deltaReserved,
  };
}

/**
 * Reads the current level without locking, for error messages only.
 *
 * Deliberately separate from the guard above: a decision about whether a
 * sale may proceed is made by the conditional UPDATE, never by a value read
 * a moment earlier. This exists so "Only 1 left" can name a real number.
 */
export async function peekAvailable(
  tx: Tx,
  variantId: string,
  locationId: string,
): Promise<{ quantity: number; reservedQuantity: number; available: number }> {
  const level = await tx.inventoryLevel.findUnique({
    where: { variantId_locationId: { variantId, locationId } },
    select: { quantity: true, reservedQuantity: true },
  });
  const quantity = level?.quantity ?? 0;
  const reservedQuantity = level?.reservedQuantity ?? 0;
  return { quantity, reservedQuantity, available: quantity - reservedQuantity };
}
