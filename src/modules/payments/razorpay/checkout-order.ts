/**
 * The Razorpay order behind a storefront checkout.
 *
 * The amount is never taken from the browser. It is the order's own payment
 * amount, read here, so a client cannot open a ₹1 payment against a ₹10 lakh
 * order. The Razorpay order id is stored on the payment row, which is what
 * later lets verification prove a payment belongs to THIS order.
 */
import { prisma } from "../../_shared/db";
import { DomainError } from "../../_shared/errors";
import { razorpayClient } from "./config";

/** Razorpay will not create an order below one rupee. */
export const MIN_GATEWAY_AMOUNT_CENTS = 100;

export interface CheckoutOrder {
  razorpayOrderId: string;
  amountCents: number;
  currency: string;
  keyId: string;
}

export async function createCheckoutOrder(orderId: string, userId: string): Promise<CheckoutOrder> {
  const gateway = razorpayClient();
  if (!gateway) throw new DomainError("PAYMENT_FAILED", "Online payment is not set up yet");

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      userId: true,
      orderNumber: true,
      status: true,
      paymentStatus: true,
      payment: { select: { amountCents: true, currency: true, razorpayOrderId: true } },
    },
  });
  // The same answer for "no such order" and "someone else's order", so order
  // ids cannot be probed.
  if (!order || order.userId !== userId || !order.payment) {
    throw new DomainError("ORDER_NOT_FOUND", "That order could not be found");
  }
  if (order.status !== "PENDING" || order.paymentStatus !== "PENDING") {
    throw new DomainError("CONFLICT", "This order is no longer waiting for payment");
  }

  const { amountCents, currency, razorpayOrderId } = order.payment;
  if (amountCents < MIN_GATEWAY_AMOUNT_CENTS) {
    throw new DomainError("VALIDATION_FAILED", "The amount is below the minimum the gateway accepts");
  }

  // A retry of the same checkout (the modal closed, the card declined) reuses
  // the gateway order: it is still open and still for this exact amount.
  if (razorpayOrderId) return { razorpayOrderId, amountCents, currency, keyId: gateway.keyId };

  const created = await gateway.client.orders.create({
    amount: amountCents,
    currency,
    receipt: order.orderNumber.slice(0, 40),
    notes: { orderId: order.id, orderNumber: order.orderNumber },
  });

  // Two tabs racing: whichever stored first wins, the other uses that one.
  const stored = await prisma.payment.updateMany({
    where: { orderId: order.id, razorpayOrderId: null },
    data: { razorpayOrderId: created.id },
  });
  if (stored.count === 0) {
    const winner = await prisma.payment.findUnique({ where: { orderId: order.id }, select: { razorpayOrderId: true } });
    return { razorpayOrderId: winner?.razorpayOrderId ?? created.id, amountCents, currency, keyId: gateway.keyId };
  }
  return { razorpayOrderId: created.id, amountCents, currency, keyId: gateway.keyId };
}
