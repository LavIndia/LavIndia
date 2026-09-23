/**
 * The header record for a delivery of stock.
 *
 * A delivery is a thing in its own right: it came from someone, on a
 * particular bill, on a particular day. Those facts belong to the delivery
 * and not to each piece inside it — copying them onto every line would make
 * a ten-line delivery ten chances to disagree about which invoice it arrived
 * on, and would leave nothing to point at when the accountant asks to see
 * the purchase.
 *
 * The lines themselves remain ordinary ledger movements carrying this id.
 * The ledger stays the single record of stock actually moving; this only
 * says what a movement was part of.
 */
import type { Tx } from "../../_shared/db";
import type { MovementContext, StockLine } from "../contracts";

/**
 * Opens the delivery's record, or finds the one a retry already opened.
 *
 * Returns undefined when there is nothing worth recording about the
 * delivery. Stock still moves and is still ledgered in that case; there is
 * simply no purchase to point at, which is the honest outcome for someone
 * booking in a box they found in the back room.
 *
 * A dropped response is routine and the lines are already replay-safe. If
 * the header were not, a retried delivery would strand an extra empty
 * receipt every time — so the key that protects the lines is used to
 * recognise the header too.
 */
export async function openReceipt(
  client: Tx,
  lines: readonly StockLine[],
  context: MovementContext,
): Promise<string | undefined> {
  const hasDetail =
    context.supplierId || context.invoiceNumber || context.invoiceDate || context.reason;
  if (!hasDetail) return undefined;

  if (context.idempotencyKey && lines.length > 0) {
    const existing = await client.inventoryMovement.findUnique({
      where: { idempotencyKey: `${context.idempotencyKey}:${lines[0].variantId}` },
      select: { receiptId: true },
    });
    if (existing?.receiptId) return existing.receiptId;
  }

  const receipt = await client.stockReceipt.create({
    data: {
      supplierId: context.supplierId ?? null,
      invoiceNumber: context.invoiceNumber ?? null,
      invoiceDate: context.invoiceDate ?? null,
      notes: context.reason ?? null,
      receivedBy: context.actorId ?? null,
    },
    select: { id: true },
  });

  return receipt.id;
}
