/**
 * Stock for an order that is cancelled, refunded or brought back.
 *
 * Worked out from the ledger, never from the order's status: what an order
 * holds is whatever its SALE movements took minus what its RETURN movements
 * gave back. That makes giving stock back once-only by construction — a
 * second cancel, or a refund after a cancel, finds nothing left to return —
 * and keeps a cancel, reinstate, cancel cycle in balance.
 *
 * The caller holds a lock on the order row (orders/order-status), so two
 * simultaneous cancels can never both read the same balance.
 */
import type { Tx } from "../../_shared/db";
import { LocationId, VariantId } from "../../_shared/ids";
import type { StockLine } from "../contracts";
import { inventoryService } from "../inventory-service";

const ORDER = "ORDER";

/** What an order still has out of stock, per variant and location. */
interface Balance {
  variantId: string;
  locationId: string;
  sold: number;
  returned: number;
}

async function orderBalances(tx: Tx, orderId: string): Promise<Balance[]> {
  const rows = await tx.inventoryMovement.groupBy({
    by: ["variantId", "locationId", "type"],
    where: {
      referenceType: ORDER,
      referenceId: orderId,
      type: { in: ["SALE", "RETURN"] },
      variantId: { not: null },
    },
    _sum: { quantity: true },
  });

  const byKey = new Map<string, Balance>();
  for (const row of rows) {
    const key = `${row.variantId}|${row.locationId}`;
    const balance =
      byKey.get(key) ??
      { variantId: row.variantId!, locationId: row.locationId, sold: 0, returned: 0 };
    if (row.type === "SALE") balance.sold += row._sum.quantity ?? 0;
    else balance.returned += row._sum.quantity ?? 0;
    byKey.set(key, balance);
  }
  return [...byKey.values()];
}

/** Lines grouped by the location they move at — one service call per location. */
function byLocation(entries: { variantId: string; locationId: string; quantity: number }[]) {
  const groups = new Map<string, StockLine[]>();
  for (const entry of entries) {
    if (entry.quantity <= 0) continue;
    const lines = groups.get(entry.locationId) ?? [];
    lines.push({ variantId: VariantId(entry.variantId), quantity: entry.quantity });
    groups.set(entry.locationId, lines);
  }
  return groups;
}

/**
 * Puts an order's pieces back: everything it sold and has not yet returned
 * goes back on the shelf it left as a RETURN movement, and any hold still
 * waiting on an unpaid payment is released. Returns the units made sellable
 * again, returned and released together.
 */
export async function returnOrderStock(
  tx: Tx,
  orderId: string,
  context: { actorId?: string; reason: string },
): Promise<number> {
  const [balances, holds] = await Promise.all([
    orderBalances(tx, orderId),
    tx.inventoryReservation.findMany({
      where: { referenceType: ORDER, referenceId: orderId, status: "HELD" },
      select: { variantId: true, locationId: true, quantity: true },
    }),
  ]);

  const owed = balances.map((b) => ({ ...b, quantity: b.sold - b.returned }));
  let units = 0;
  for (const [locationId, lines] of byLocation(owed)) {
    await inventoryService.returnStock(
      lines,
      {
        locationId: LocationId(locationId),
        referenceType: ORDER,
        referenceId: orderId,
        actorId: context.actorId,
        reason: context.reason,
      },
      tx,
    );
    units += lines.reduce((sum, line) => sum + line.quantity, 0);
  }

  for (const [locationId, lines] of byLocation(holds)) {
    await inventoryService.release(
      lines,
      {
        locationId: LocationId(locationId),
        referenceType: ORDER,
        referenceId: orderId,
        actorId: context.actorId,
        reason: context.reason,
      },
      tx,
    );
    units += lines.reduce((sum, line) => sum + line.quantity, 0);
  }

  return units;
}

/**
 * Takes stock again for an order brought back from cancellation, so a
 * reinstated order cannot sell a piece that went back on the shelf. Only an
 * order that was sold in the first place is retaken; one that never got past
 * payment never held stock. Fails with insufficient stock rather than
 * overselling. Returns the variants retaken.
 */
export async function retakeOrderStock(
  tx: Tx,
  orderId: string,
  ordered: readonly { variantId: string; quantity: number }[],
  context: { actorId?: string; reason: string },
): Promise<string[]> {
  const balances = await orderBalances(tx, orderId);
  if (!balances.some((b) => b.sold > 0)) return [];

  const wanted = new Map<string, number>();
  for (const line of ordered) {
    wanted.set(line.variantId, (wanted.get(line.variantId) ?? 0) + line.quantity);
  }

  const fallback = await inventoryService.getDefaultLocationId();
  const shortfall = [...wanted].map(([variantId, quantity]) => {
    const rows = balances.filter((b) => b.variantId === variantId);
    const held = rows.reduce((sum, b) => sum + b.sold - b.returned, 0);
    // Taken again from the shelf it was first sold from.
    const locationId = rows.find((b) => b.sold > 0)?.locationId ?? fallback;
    return { variantId, locationId, quantity: quantity - held };
  });

  const retaken: string[] = [];
  for (const [locationId, lines] of byLocation(shortfall)) {
    await inventoryService.commitSale(
      lines,
      {
        locationId: LocationId(locationId),
        referenceType: ORDER,
        referenceId: orderId,
        actorId: context.actorId,
        reason: context.reason,
      },
      tx,
    );
    retaken.push(...lines.map((line) => line.variantId as string));
  }
  return retaken;
}
