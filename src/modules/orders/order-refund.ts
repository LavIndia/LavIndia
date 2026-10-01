/**
 * Recording a refund the shop has sent back by hand.
 *
 * Nothing here moves money: no gateway is called. Staff send the refund the
 * way they choose — UPI, card reversal, cash, bank transfer — and record what
 * they did, so the order says how much went back, how and when, with the
 * reference (UTR, approval code, a note) to reconcile it by.
 *
 * Recording a refund and moving the order to Refunded are separate choices:
 * a part refund may leave the order Cancelled with more still to send.
 * Recording again replaces the figures — the amount is the total sent back —
 * and the audit log keeps every version.
 */
import { z } from "zod";
import type { Tx } from "../_shared/db";
import { DomainError } from "../_shared/errors";
import { REFUND_METHODS, type RefundMethodCode } from "./order-labels";
import { canRecordRefund } from "./refund-state";

export const refundInputSchema = z.object({
  amountCents: z.number().int().positive("Enter the amount refunded"),
  method: z.enum(REFUND_METHODS as [RefundMethodCode, ...RefundMethodCode[]]),
  reference: z
    .string()
    .trim()
    .max(120, "Keep the reference under 120 characters")
    .optional()
    .transform((value) => (value ? value : undefined)),
});

export type RefundInput = z.infer<typeof refundInputSchema>;

/**
 * Saves the refund onto the order's payment. Runs in the caller's
 * transaction, after the status change, so it sees the order as it now is.
 */
export async function recordRefund(tx: Tx, orderId: string, input: RefundInput) {
  const order = await tx.order.findUnique({
    where: { id: orderId },
    select: { status: true, paymentStatus: true, payment: { select: { amountCents: true } } },
  });
  if (!order) throw new DomainError("ORDER_NOT_FOUND", "That order no longer exists");
  if (!order.payment || !canRecordRefund({ status: order.status, paymentStatus: order.paymentStatus })) {
    throw new DomainError(
      "VALIDATION_FAILED",
      "A refund can be recorded only on a paid order that has been cancelled or refunded.",
    );
  }
  if (input.amountCents > order.payment.amountCents) {
    throw new DomainError("VALIDATION_FAILED", "A refund cannot be more than was paid.", {
      paidCents: order.payment.amountCents,
    });
  }

  return tx.payment.update({
    where: { orderId },
    data: {
      refundedCents: input.amountCents,
      refundedAt: new Date(),
      refundMethod: input.method,
      refundReference: input.reference ?? null,
    },
    select: { refundedCents: true, refundMethod: true, refundReference: true, refundedAt: true },
  });
}
