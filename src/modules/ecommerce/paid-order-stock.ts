/**
 * Taking the stock for an online order once its payment is confirmed.
 *
 * The usual case settles the hold placed at checkout (commitPaidOrder). But a
 * hold can be gone by the time the money lands — the sweeper released it
 * after its window, or the order was cancelled and brought back. Settling a
 * hold that no longer exists would either fail, or, because the guard is on
 * the variant's total reservation, quietly consume ANOTHER shopper's hold on
 * the same piece. So the holds are checked first:
 *
 *   - all still held   → settle them, exactly as before;
 *   - any lapsed       → release what is left of them and take the pieces
 *                        straight off the shelf, which fails with
 *                        INSUFFICIENT_STOCK rather than overselling.
 *
 * Runs in the caller's transaction, under its lock on the order.
 */
import type { Tx } from "../_shared/db";
import { LocationId, OrderId, VariantId } from "../_shared/ids";
import { withdrawSoldOutRetiredProducts } from "../catalog";
import { inventoryService, type StockLine } from "../inventory";
import { checkoutService } from "./checkout-service";

const ORDER = "ORDER";

/** The order's lines summed per variant — one product may appear on two lines. */
function perVariant(lines: readonly { variantId: string; quantity: number }[]) {
  const totals = new Map<string, number>();
  for (const line of lines) totals.set(line.variantId, (totals.get(line.variantId) ?? 0) + line.quantity);
  return totals;
}

/** Converts the order's holds — or, if they lapsed, takes fresh stock — into a sale. */
export async function takePaidOrderStock(
  tx: Tx,
  orderId: string,
  lines: readonly { variantId: string; quantity: number }[],
): Promise<void> {
  if (lines.length === 0) return;

  const holds = await tx.inventoryReservation.findMany({
    where: { referenceType: ORDER, referenceId: orderId, status: "HELD" },
    select: { variantId: true, locationId: true, quantity: true },
  });
  const held = perVariant(holds);
  const wanted = perVariant(lines);
  const fullyHeld = [...wanted].every(([variantId, quantity]) => (held.get(variantId) ?? 0) >= quantity);

  if (fullyHeld) {
    await checkoutService.commitPaidOrder(OrderId(orderId), lines, tx);
    return;
  }

  // Part of the hold lapsed. What is left of it is released first, so those
  // units count as available again for the fresh sale just below.
  const byLocation = new Map<string, StockLine[]>();
  for (const hold of holds) {
    const group = byLocation.get(hold.locationId) ?? [];
    group.push({ variantId: VariantId(hold.variantId), quantity: hold.quantity });
    byLocation.set(hold.locationId, group);
  }
  for (const [locationId, group] of byLocation) {
    await inventoryService.release(
      group,
      {
        locationId: LocationId(locationId),
        referenceType: ORDER,
        referenceId: orderId,
        actorId: "storefront",
        reason: "Hold lapsed before payment",
      },
      tx,
    );
  }

  await inventoryService.commitSale(
    [...wanted].map(([variantId, quantity]) => ({ variantId: VariantId(variantId), quantity })),
    { referenceType: ORDER, referenceId: orderId, actorId: "storefront", reason: "Paid after the hold lapsed" },
    tx,
  );
  await withdrawSoldOutRetiredProducts(tx, { variantIds: [...wanted.keys()] });
}
