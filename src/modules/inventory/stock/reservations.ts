/**
 * Named, expiring holds on stock.
 *
 * `InventoryLevel.reservedQuantity` is the aggregate the sell path reads;
 * these rows are the detail behind it, and both are written in the same
 * transaction so they can never disagree.
 *
 * Two problems a bare counter cannot solve, and this file exists for:
 *
 *   1. A release must know WHOSE hold it is releasing. With only a counter,
 *      a duplicate release silently frees stock nobody gave back.
 *   2. A hold must expire. If a shopper abandons a payment and the release
 *      never runs — crashed process, closed tab, a gateway that never calls
 *      back — the last piece in the shop would be held forever.
 */
import type { Tx } from "../../_shared/db";
import type { LocationId, VariantId } from "../../_shared/ids";
import type { StockLine } from "../contracts";

/**
 * How long an unsettled hold survives. Comfortably longer than a card or UPI
 * flow takes, short enough that an abandoned checkout frees the piece the
 * same afternoon rather than the next time somebody notices.
 */
export const RESERVATION_TTL_MINUTES = 30;

export interface ReservationRef {
  referenceType: string;
  referenceId: string;
}

export function reservationExpiry(now: Date = new Date()): Date {
  return new Date(now.getTime() + RESERVATION_TTL_MINUTES * 60_000);
}

/**
 * Records the holds that accompany a level's `reservedQuantity` increase.
 *
 * The unique key on (referenceType, referenceId, variantId) means a retried
 * checkout cannot stack duplicate holds for the same order line — the second
 * attempt updates the existing row instead of adding another.
 */
export async function recordReservations(
  tx: Tx,
  lines: readonly StockLine[],
  locationId: LocationId,
  ref: ReservationRef,
  actorId?: string,
): Promise<void> {
  const expiresAt = reservationExpiry();

  for (const line of lines) {
    await tx.inventoryReservation.upsert({
      where: {
        referenceType_referenceId_variantId: {
          referenceType: ref.referenceType,
          referenceId: ref.referenceId,
          variantId: line.variantId,
        },
      },
      create: {
        variantId: line.variantId,
        locationId,
        quantity: line.quantity,
        referenceType: ref.referenceType,
        referenceId: ref.referenceId,
        expiresAt,
        createdBy: actorId ?? null,
        status: "HELD",
      },
      update: {
        quantity: { increment: line.quantity },
        expiresAt,
        status: "HELD",
      },
    });
  }
}

/** Marks holds settled into a completed sale. */
export async function markReservationsConsumed(
  tx: Tx,
  variantIds: readonly VariantId[],
  ref: ReservationRef,
): Promise<void> {
  await tx.inventoryReservation.updateMany({
    where: {
      referenceType: ref.referenceType,
      referenceId: ref.referenceId,
      variantId: { in: [...variantIds] },
      status: "HELD",
    },
    data: { status: "CONSUMED", consumedAt: new Date() },
  });
}

/** Marks holds given back to the pool. */
export async function markReservationsReleased(
  tx: Tx,
  variantIds: readonly VariantId[],
  ref: ReservationRef,
): Promise<void> {
  await tx.inventoryReservation.updateMany({
    where: {
      referenceType: ref.referenceType,
      referenceId: ref.referenceId,
      variantId: { in: [...variantIds] },
      status: "HELD",
    },
    data: { status: "RELEASED", releasedAt: new Date() },
  });
}

/**
 * Finds holds that have outlived their window, so they can be released.
 *
 * Returns the work rather than doing it: the caller performs the release
 * through the ordinary service path, which writes the ledger entry too. A
 * sweep must leave the same audit trail as a manual release.
 */
export async function findExpiredReservations(
  tx: Tx,
  limit = 100,
): Promise<
  {
    id: string;
    variantId: string;
    locationId: string;
    quantity: number;
    referenceType: string;
    referenceId: string;
  }[]
> {
  return tx.inventoryReservation.findMany({
    where: { status: "HELD", expiresAt: { lt: new Date() } },
    orderBy: { expiresAt: "asc" },
    take: limit,
    select: {
      id: true,
      variantId: true,
      locationId: true,
      quantity: true,
      referenceType: true,
      referenceId: true,
    },
  });
}
