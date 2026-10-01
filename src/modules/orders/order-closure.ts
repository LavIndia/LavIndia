/**
 * When a cancelled or refunded order may NOT be brought back.
 *
 * Reinstating used to be always allowed — the stock is retaken and the order
 * carries on. Two things now make that wrong:
 *
 *   1. Its invoice has been credited. GST allows one invoice per sale and an
 *      invoice is never revived once a credit note cancels it; the order
 *      keeps exactly one invoice (unique per order), so there is no second
 *      bill it could carry. The sale is over — a new order makes a new bill.
 *   2. The client paid after it was cancelled. Its pieces were never taken
 *      and it was never billed, so "reinstating" would ship stock nobody set
 *      aside on an order with no invoice. The money is refunded instead.
 *
 * Both are refused with a message the admin can act on. Runs only on the
 * reinstatement path, so ordinary status changes pay nothing for it.
 */
import type { Tx } from "../_shared/db";
import { DomainError } from "../_shared/errors";
import { isPaidAfterCancellation } from "./refund-state";

export async function assertReinstatable(tx: Tx, orderId: string): Promise<void> {
  const [creditNote, payment] = await Promise.all([
    tx.creditNote.findFirst({ where: { orderId }, select: { creditNoteNumber: true } }),
    tx.payment.findUnique({ where: { orderId }, select: { metadata: true } }),
  ]);

  if (creditNote) {
    throw new DomainError(
      "CONFLICT",
      `This order's invoice was cancelled by credit note ${creditNote.creditNoteNumber}, so the order cannot be reopened. Place a new order to sell these pieces again.`,
      { creditNoteNumber: creditNote.creditNoteNumber },
    );
  }
  if (isPaidAfterCancellation(payment?.metadata)) {
    throw new DomainError(
      "CONFLICT",
      "This order was paid after it had been cancelled, and its pieces were never set aside. Record the refund, or place a new order.",
    );
  }
}
