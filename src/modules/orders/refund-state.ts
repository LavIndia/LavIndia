/**
 * Whether an order owes the client money back, worked out from fields the
 * order already has — no flag of its own to fall out of step.
 *
 *   - Cancelled while paid: the payment stays "Paid" on a cancelled order
 *     until the money is sent back (orders/order-status), so that pairing IS
 *     the refund-owed state.
 *   - Paid after cancellation: a gateway payment that landed once the order
 *     was already cancelled. Marked on the payment's metadata when it is
 *     recorded (ecommerce/settle-gateway-payment), so the screen can say why.
 *
 * Once staff record the refund, it is no longer owed — whether or not they
 * also move the order to Refunded (a part refund may leave it Cancelled).
 *
 * Pure: safe on the server and in the browser.
 */

/** The key written to `Payment.metadata` when money arrives after cancellation. */
export const PAID_AFTER_CANCELLATION = "paidAfterCancellation";

export function isPaidAfterCancellation(metadata: unknown): boolean {
  return (
    typeof metadata === "object" &&
    metadata !== null &&
    (metadata as Record<string, unknown>)[PAID_AFTER_CANCELLATION] === true
  );
}

export interface RefundStateInput {
  status: string;
  paymentStatus: string;
  payment?: { refundedCents?: number | null } | null;
}

/** A paid order that has been closed and has no refund recorded yet. */
export function isRefundOwed(order: RefundStateInput): boolean {
  return (
    (order.status === "CANCELLED" || order.status === "REFUNDED") &&
    order.paymentStatus === "COMPLETED" &&
    !order.payment?.refundedCents
  );
}

/** Money came in for this order and it has since been closed — a refund can be recorded. */
export function canRecordRefund(order: RefundStateInput): boolean {
  return (
    (order.status === "CANCELLED" || order.status === "REFUNDED") &&
    (order.paymentStatus === "COMPLETED" || order.paymentStatus === "REFUNDED")
  );
}
