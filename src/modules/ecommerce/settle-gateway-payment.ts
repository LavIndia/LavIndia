/**
 * Settling an online order once the gateway confirms its payment.
 *
 * The signature has already been checked by the caller (api/payment/verify).
 * What happens next depends on the order as it stands, read under a row lock
 * so an admin cancelling it at the same moment queues behind this:
 *
 *   - Open and unpaid: the ordinary sale. Stock taken, payment recorded,
 *     offers counted and the invoice raised, together or not at all.
 *   - Already paid with this payment: a repeat of the same confirmation (a
 *     retry, a double tap). Nothing is done twice.
 *   - Cancelled or refunded: the money arrived after the order was closed —
 *     its stock went back and its holds were released. The payment is
 *     recorded, because it happened, but the order is NOT revived, no stock
 *     is taken and no invoice is raised. It shows as "Paid" on a cancelled
 *     order, which is the refund-owed state (orders/refund-state).
 *   - Open, but the hold lapsed and the pieces have since sold: there is
 *     nothing to sell. The payment is recorded and the order is cancelled,
 *     so it too reads as a refund owed rather than a paid order with no stock.
 */
import { Prisma } from "@prisma/client";
import { prisma, type Tx } from "../_shared/db";
import { DomainError, isDomainError } from "../_shared/errors";
import { OrderId } from "../_shared/ids";
import { billingService } from "../billing/billing-service";
import { changeOrderStatus } from "../orders/order-status";
import { PAID_AFTER_CANCELLATION } from "../orders/refund-state";
import { countOrderRedemption } from "../promotions";
import { takePaidOrderStock } from "./paid-order-stock";

export interface GatewayPayment {
  orderId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  /** What the gateway says the money came in on; each field only when known. */
  instrument: {
    method?: string | null;
    instrumentDetail?: string | null;
    payerVpa?: string | null;
    utr?: string | null;
  };
}

/** PAID — a normal sale. CLOSED — paid, but the order had been cancelled and a refund is owed. */
export type SettleOutcome = "PAID" | "ALREADY_PAID" | "CLOSED";

const CLOSED_STATUSES = ["CANCELLED", "REFUNDED"];

interface Locked {
  status: string;
  paymentStatus: string;
  razorpayPaymentId: string | null;
}

async function lockOrder(tx: Tx, orderId: string): Promise<Locked> {
  const [row] = await tx.$queryRaw<Locked[]>(Prisma.sql`
    SELECT o."status", o."paymentStatus", p."razorpayPaymentId"
      FROM "orders" o LEFT JOIN "payments" p ON p."orderId" = o."id"
     WHERE o."id" = ${orderId} FOR UPDATE OF o
  `);
  if (!row) throw new DomainError("ORDER_NOT_FOUND", "That order no longer exists");
  return row;
}

/** The payment row's gateway fields, written the same way on every path. */
function paymentData(payment: GatewayPayment, lateNote?: string): Prisma.PaymentUpdateInput {
  const { instrument } = payment;
  return {
    razorpayOrderId: payment.razorpayOrderId,
    razorpayPaymentId: payment.razorpayPaymentId,
    razorpaySignature: payment.razorpaySignature,
    status: "COMPLETED",
    // Recorded only when known, so a failed lookup never overwrites a detail
    // that some other path (a webhook, say) already captured.
    ...(instrument.method ? { method: instrument.method } : {}),
    ...(instrument.instrumentDetail ? { instrumentDetail: instrument.instrumentDetail } : {}),
    ...(instrument.payerVpa ? { payerVpa: instrument.payerVpa } : {}),
    ...(instrument.utr ? { utr: instrument.utr } : {}),
    ...(lateNote
      ? { metadata: { [PAID_AFTER_CANCELLATION]: true, reason: lateNote, at: new Date().toISOString() } }
      : {}),
  };
}

/** Records money that arrived for an order that can no longer be fulfilled. */
async function recordLatePayment(tx: Tx, payment: GatewayPayment, description: string) {
  await tx.payment.update({ where: { orderId: payment.orderId }, data: paymentData(payment, description) });
  await tx.order.update({
    where: { id: payment.orderId },
    data: { paymentStatus: "COMPLETED", paymentId: payment.razorpayPaymentId },
  });
  await tx.orderTracking.create({
    data: { orderId: payment.orderId, status: "Payment received — refund owed", description, updatedBy: "system" },
  });
}

async function settleOpenOrder(tx: Tx, payment: GatewayPayment): Promise<void> {
  const { orderId, instrument } = payment;
  const items = await tx.orderItem.findMany({
    where: { orderId, variantId: { not: null } },
    select: { variantId: true, quantity: true },
  });
  await tx.payment.update({ where: { orderId }, data: paymentData(payment) });
  await tx.order.update({
    where: { id: orderId },
    data: { paymentStatus: "COMPLETED", paymentId: payment.razorpayPaymentId, status: "PROCESSING" },
  });
  await tx.orderTracking.create({
    data: {
      orderId,
      status: "Payment confirmed",
      description: instrument.instrumentDetail
        ? `Payment received via ${instrument.instrumentDetail}`
        : "Payment successfully received online",
      updatedBy: "system",
    },
  });
  await takePaidOrderStock(
    tx,
    orderId,
    items.map((item) => ({ variantId: item.variantId!, quantity: item.quantity })),
  );
  // The order is real now, so its offers count against their limits.
  await countOrderRedemption(tx, orderId);
  await billingService.issueInvoiceForOrder(OrderId(orderId), undefined, tx);
}

export async function settleGatewayPayment(payment: GatewayPayment): Promise<SettleOutcome> {
  try {
    return await prisma.$transaction(
      async (tx) => {
        const order = await lockOrder(tx, payment.orderId);
        const closed = CLOSED_STATUSES.includes(order.status);
        if (order.paymentStatus === "COMPLETED" && order.razorpayPaymentId === payment.razorpayPaymentId) {
          return closed ? "CLOSED" : "ALREADY_PAID";
        }
        if (closed) {
          await recordLatePayment(
            tx,
            payment,
            "Payment arrived after the order was cancelled. Nothing was taken from stock; the client is owed a refund.",
          );
          return "CLOSED";
        }
        await settleOpenOrder(tx, payment);
        return "PAID";
      },
      { timeout: 20_000 },
    );
  } catch (error) {
    if (!isDomainError(error) || error.code !== "INSUFFICIENT_STOCK") throw error;
  }

  // The hold lapsed and the pieces sold meanwhile. The attempt above rolled
  // back whole, so this starts clean: record the money, then cancel the
  // order through the ordinary path so any remaining hold is released.
  return prisma.$transaction(
    async (tx) => {
      // Re-read under the lock: someone may have settled or closed it since.
      const order = await lockOrder(tx, payment.orderId);
      const closed = CLOSED_STATUSES.includes(order.status);
      if (order.paymentStatus === "COMPLETED") return closed ? "CLOSED" : "ALREADY_PAID";
      await recordLatePayment(
        tx,
        payment,
        "Payment arrived after the pieces had sold. The order was cancelled; the client is owed a refund.",
      );
      if (!closed) await changeOrderStatus(tx, payment.orderId, "CANCELLED", "system");
      return "CLOSED";
    },
    { timeout: 20_000 },
  );
}
