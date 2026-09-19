/**
 * Releases stock holds that have outlived their window.
 *
 * Without this, an abandoned checkout strands its stock permanently: a
 * shopper closes the tab mid-payment, the release never runs, and the last
 * piece in the shop becomes unsellable with nothing on any screen explaining
 * why. Run it on a schedule.
 *
 * It is written against `InventoryPort` rather than against the tables, so it
 * releases through the ordinary service path and a swept hold leaves exactly
 * the same ledger trail as one released by hand.
 */
import { prisma } from "../../_shared/db";
import { LocationId, VariantId } from "../../_shared/ids";
import type { InventoryPort } from "../contracts";
import { findExpiredReservations } from "./reservations";

export interface SweepResult {
  swept: number;
  failed: number;
}

export async function releaseExpiredReservations(
  inventory: Pick<InventoryPort, "release">,
  limit = 100,
): Promise<SweepResult> {
  const expired = await findExpiredReservations(prisma, limit);
  let swept = 0;
  let failed = 0;

  for (const hold of expired) {
    try {
      await inventory.release([{ variantId: VariantId(hold.variantId), quantity: hold.quantity }], {
        locationId: LocationId(hold.locationId),
        referenceType: hold.referenceType,
        referenceId: hold.referenceId,
        reason: "Reservation expired",
        actorId: "system",
      });
      swept++;
    } catch (error) {
      // One stubborn row must not stop the rest of the sweep.
      failed++;
      console.error(`Failed to release expired reservation ${hold.id}:`, error);
    }
  }

  return { swept, failed };
}
