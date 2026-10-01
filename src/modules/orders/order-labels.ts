/**
 * The words an admin sees for an order's stored codes — in one place.
 *
 * The database stores `OUT_FOR_DELIVERY`, `CASH`, `razorpay`; a person reads
 * "Out for delivery", "Cash", "Paid online". Every screen, receipt and export
 * reads its labels from here, so the same order never reads differently
 * depending on where it is looked at.
 *
 * Payments are named by the INSTRUMENT the customer used — UPI, Card, Cash,
 * Cash on delivery, Net banking — never by the gateway that carried it.
 *
 * Pure: no Prisma client, no React, safe on the server and in the browser.
 */

import { humaniseCode } from "@/modules/_shared/humanise-code";

export type OrderStatusCode =
  | "PENDING"
  | "PROCESSING"
  | "SHIPPED"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED"
  | "REFUNDED";

export type PaymentStatusCode = "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED";

export type OrderChannelCode = "ONLINE" | "STORE";

export const ORDER_STATUS_LABELS: Record<OrderStatusCode, string> = {
  PENDING: "Pending",
  PROCESSING: "Processing",
  SHIPPED: "Shipped",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatusCode, string> = {
  PENDING: "Awaiting payment",
  COMPLETED: "Paid",
  FAILED: "Failed",
  REFUNDED: "Refunded",
};

export const CHANNEL_LABELS: Record<OrderChannelCode, string> = {
  STORE: "Walk-in",
  ONLINE: "Online",
};

/**
 * Every spelling a payment method is stored under → its instrument name.
 *
 * Keys are lower-case: the counter writes `CASH`/`UPI`/`CARD`, the website
 * writes `cod`/`razorpay`, and the gateway reports `upi`/`card`/`netbanking`.
 * `razorpay` alone says only that the money came through online checkout —
 * the instrument is recorded separately once verified — so it reads as
 * "Paid online" rather than the gateway's name.
 */
const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  upi: "UPI",
  card: "Card",
  cod: "Cash on delivery",
  netbanking: "Net banking",
  wallet: "Wallet",
  emi: "EMI",
  paylater: "Pay later",
  razorpay: "Paid online",
  online: "Paid online",
  other: "Other",
};

export function orderStatusLabel(code: string): string {
  return ORDER_STATUS_LABELS[code as OrderStatusCode] ?? humaniseCode(code);
}

export function paymentStatusLabel(code: string): string {
  return PAYMENT_STATUS_LABELS[code as PaymentStatusCode] ?? humaniseCode(code);
}

export function channelLabel(code: string): string {
  return CHANNEL_LABELS[code as OrderChannelCode] ?? humaniseCode(code);
}

/** A stored payment method, in any spelling → the instrument's name ("" when none). */
export function paymentMethodLabel(raw: string | null | undefined): string {
  const value = raw?.trim();
  // A placeholder such as "—" is no method at all, so the caller can hide it.
  if (!value || !/[A-Za-z0-9]/.test(value)) return "";
  return PAYMENT_METHOD_LABELS[value.toLowerCase()] ?? humaniseCode(value);
}

/**
 * How the customer paid, as specifically as is known.
 *
 * Three levels, best first:
 *
 * 1. The instrument itself — "HDFC Bank •••• 4242", "ananya@okicici". Captured
 *    from the gateway at verification.
 * 2. The gateway's own method — "upi", "card", "netbanking" → "UPI", "Card",
 *    "Net banking".
 * 3. The route chosen at checkout — "razorpay", which says only that it was
 *    paid online, so it reads "Paid online".
 *
 * Level 3 alone is what "Card / UPI online" was, and it is nearly useless for
 * reconciling a statement. Orders placed before the instrument was captured
 * still fall back to it, so older rows stay legible rather than blank.
 */
export function paymentDescription(order: {
  paymentMethod: string | null;
  payment?: { method: string | null; instrumentDetail: string | null } | null;
}): string {
  const detail = order.payment?.instrumentDetail;
  if (detail) return detail;

  // The gateway's own method ("upi", "netbanking"), else the route chosen
  // at checkout — both named as the instrument by the shared label map.
  return paymentMethodLabel(order.payment?.method) || paymentMethodLabel(order.paymentMethod) || "—";
}
