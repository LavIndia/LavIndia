/**
 * What each Razorpay webhook event means for an order.
 *
 * The browser telling us a payment succeeded is a courtesy; the webhook is the
 * gateway telling us itself, and it arrives even when the customer closed the
 * tab, lost signal, or paid through a link or QR with no browser of ours open.
 * Both routes end in the same settle step, which is idempotent, so a payment
 * reported twice is applied once.
 *
 * Events are acknowledged (HTTP 200) whenever they are understood, even when
 * nothing needed doing — a non-200 makes Razorpay retry for days.
 */
import { prisma } from "../../_shared/db";
import { settleGatewayPayment } from "../../ecommerce";
import { describeInstrument } from "./payment-details";

interface PaymentEntity {
  id: string;
  order_id?: string | null;
  amount?: number;
  error_code?: string | null;
  error_description?: string | null;
  notes?: Record<string, unknown> | unknown[];
  method?: string;
  vpa?: string;
  bank?: string;
  wallet?: string;
  card?: { last4?: string; network?: string; issuer?: string; type?: string };
  acquirer_data?: { rrn?: string; upi_transaction_id?: string; bank_transaction_id?: string };
}

export interface WebhookEvent {
  event: string;
  payload: {
    payment?: { entity: PaymentEntity };
    payment_link?: { entity: { id: string } };
    qr_code?: { entity: { id: string } };
  };
}

export type WebhookResult = "settled" | "ignored" | "recorded";

/** Our order id for a payment: via the link/QR it came through, else its gateway order. */
async function findOrderId(event: WebhookEvent, payment: PaymentEntity): Promise<string | null> {
  const gatewayId = event.payload.payment_link?.entity.id ?? event.payload.qr_code?.entity.id;
  if (gatewayId) {
    const link = await prisma.paymentLink.findUnique({ where: { gatewayId }, select: { orderId: true } });
    if (link) return link.orderId;
  }
  if (payment.order_id) {
    const row = await prisma.payment.findUnique({ where: { razorpayOrderId: payment.order_id }, select: { orderId: true } });
    if (row) return row.orderId;
  }
  const noted = Array.isArray(payment.notes) ? undefined : payment.notes?.orderId;
  return typeof noted === "string" ? noted : null;
}

async function markLink(gatewayId: string | undefined, status: "PAID" | "EXPIRED"): Promise<void> {
  if (!gatewayId) return;
  await prisma.paymentLink.updateMany({
    where: { gatewayId, status: "CREATED" },
    data: { status, ...(status === "PAID" ? { paidAt: new Date() } : {}) },
  });
}

async function settleCaptured(event: WebhookEvent, payment: PaymentEntity): Promise<WebhookResult> {
  const orderId = await findOrderId(event, payment);
  if (!orderId) return "ignored";

  // The money must be what the order costs. A short or long payment is not
  // quietly accepted as "paid"; it is flagged for staff to look at.
  const expected = await prisma.payment.findUnique({ where: { orderId }, select: { amountCents: true } });
  if (!expected) return "ignored";
  if (payment.amount !== expected.amountCents) {
    await prisma.payment.update({
      where: { orderId },
      data: {
        errorCode: "AMOUNT_MISMATCH",
        errorDescription: `Gateway payment ${payment.id} was for ${payment.amount} paise; the order is for ${expected.amountCents}.`,
      },
    });
    return "recorded";
  }

  const outcome = await settleGatewayPayment({
    orderId,
    razorpayOrderId: payment.order_id ?? null,
    razorpayPaymentId: payment.id,
    instrument: describeInstrument(payment),
  });
  await markLink(event.payload.payment_link?.entity.id ?? event.payload.qr_code?.entity.id, "PAID");
  return outcome === "ALREADY_PAID" ? "ignored" : "settled";
}

async function recordFailure(payment: PaymentEntity): Promise<WebhookResult> {
  if (!payment.order_id) return "ignored";
  // The order stays open: a declined card is not the end of the checkout.
  const updated = await prisma.payment.updateMany({
    where: { razorpayOrderId: payment.order_id, status: "PENDING" },
    data: {
      errorCode: payment.error_code ?? "PAYMENT_FAILED",
      errorDescription: payment.error_description ?? "The payment attempt failed",
    },
  });
  return updated.count > 0 ? "recorded" : "ignored";
}

export async function handleWebhookEvent(event: WebhookEvent): Promise<WebhookResult> {
  const payment = event.payload.payment?.entity;
  switch (event.event) {
    case "payment.captured":
    case "order.paid":
    case "payment_link.paid":
    case "qr_code.credited":
      return payment ? settleCaptured(event, payment) : "ignored";
    case "payment.failed":
      return payment ? recordFailure(payment) : "ignored";
    case "payment_link.expired":
    case "payment_link.cancelled":
      await markLink(event.payload.payment_link?.entity.id, "EXPIRED");
      return "recorded";
    case "qr_code.closed":
      await markLink(event.payload.qr_code?.entity.id, "EXPIRED");
      return "recorded";
    default:
      return "ignored";
  }
}
