/**
 * Collecting an order's payment outside the storefront checkout.
 *
 * A LINK is a hosted Razorpay page the client opens on their phone — for a
 * checkout they abandoned, a card that declined, or an order agreed by phone.
 * A QR is a single-use UPI code shown on a screen, for a client who is in the
 * shop. Both are fixed to the order's exact amount: the client cannot change
 * what they pay, and the amount is read here, never accepted from a caller.
 *
 * Paying is recorded by the webhook (webhook-events.ts), not here. This file
 * only creates, lists and cancels.
 */
import { prisma } from "../../_shared/db";
import { DomainError } from "../../_shared/errors";
import { razorpayClient } from "./config";
import { MIN_GATEWAY_AMOUNT_CENTS } from "./checkout-order";

export const LINK_EXPIRY_HOURS = { min: 1, max: 168, default: 24 } as const;
/** A QR is for someone standing at the counter, so it is short-lived. */
export const QR_EXPIRY_MINUTES = 30;

type LinkStatus = "CREATED" | "PAID" | "EXPIRED" | "CANCELLED";

export interface PaymentLinkView {
  id: string;
  kind: "LINK" | "QR";
  url: string;
  amountCents: number;
  status: LinkStatus;
  expiresAt: string | null;
  sentTo: string | null;
  createdAt: string;
}

/** Digits only, with India's code when a bare 10-digit number is given. */
function normaliseContact(value: string | null | undefined): string | undefined {
  const digits = (value ?? "").replace(/\D/g, "");
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length >= 11 && digits.length <= 15) return `+${digits}`;
  return undefined;
}

async function loadPayableOrder(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      paymentStatus: true,
      customerName: true,
      customerMobile: true,
      user: { select: { name: true, email: true } },
      payment: { select: { amountCents: true, currency: true } },
    },
  });
  if (!order || !order.payment) throw new DomainError("ORDER_NOT_FOUND", "That order could not be found");
  if (order.status !== "PENDING" || order.paymentStatus !== "PENDING") {
    throw new DomainError("CONFLICT", "This order is not waiting for payment");
  }
  if (order.payment.amountCents < MIN_GATEWAY_AMOUNT_CENTS) {
    throw new DomainError("VALIDATION_FAILED", "The amount is below the minimum the gateway accepts");
  }
  return { ...order, payment: order.payment };
}

/** Closes a link or QR on the gateway. Throws if the gateway refuses. */
async function closeOnGateway(kind: "LINK" | "QR", gatewayId: string): Promise<void> {
  const gateway = razorpayClient();
  if (!gateway) return;
  if (kind === "LINK") await gateway.client.paymentLink.cancel(gatewayId);
  else await gateway.client.qrCode.close(gatewayId);
}

/** Cancels whatever is still open for the order, so two ways of paying never both stay live. */
async function retireOpenLinks(orderId: string): Promise<void> {
  const open = await prisma.paymentLink.findMany({ where: { orderId, status: "CREATED" } });
  for (const link of open) {
    try {
      await closeOnGateway(link.kind, link.gatewayId);
    } catch {
      // Already paid, expired or closed on the gateway's side — the webhook
      // carries the truth; ours is marked cancelled either way.
    }
    await prisma.paymentLink.update({ where: { id: link.id }, data: { status: "CANCELLED" } });
  }
}

/** Keeps the pieces held for as long as the client has to pay. */
async function holdStockUntil(orderId: string, until: Date): Promise<void> {
  await prisma.inventoryReservation.updateMany({
    where: { referenceType: "ORDER", referenceId: orderId, status: "HELD", expiresAt: { lt: until } },
    data: { expiresAt: until },
  });
}

function toView(link: {
  id: string;
  kind: "LINK" | "QR";
  url: string;
  amountCents: number;
  status: LinkStatus;
  expiresAt: Date | null;
  sentTo: string | null;
  createdAt: Date;
}): PaymentLinkView {
  // An unpaid link past its time is expired whether or not the gateway has said so yet.
  const lapsed = link.status === "CREATED" && link.expiresAt !== null && link.expiresAt < new Date();
  return {
    id: link.id,
    kind: link.kind,
    url: link.url,
    amountCents: link.amountCents,
    status: lapsed ? "EXPIRED" : link.status,
    expiresAt: link.expiresAt?.toISOString() ?? null,
    sentTo: link.sentTo,
    createdAt: link.createdAt.toISOString(),
  };
}

export async function createPaymentLink(
  orderId: string,
  actorId: string,
  options: { expiryHours?: number } = {},
): Promise<PaymentLinkView> {
  const gateway = razorpayClient();
  if (!gateway) throw new DomainError("PAYMENT_FAILED", "Online payment is not set up yet");
  const order = await loadPayableOrder(orderId);

  const hours = Math.min(
    Math.max(options.expiryHours ?? LINK_EXPIRY_HOURS.default, LINK_EXPIRY_HOURS.min),
    LINK_EXPIRY_HOURS.max,
  );
  const expiresAt = new Date(Date.now() + hours * 3_600_000);
  const contact = normaliseContact(order.customerMobile);
  const email = order.user?.email ?? undefined;

  await retireOpenLinks(orderId);
  const created = await gateway.client.paymentLink.create({
    amount: order.payment.amountCents,
    currency: order.payment.currency,
    accept_partial: false,
    // Razorpay wants a unique reference per link; the suffix lets one order have several over time.
    reference_id: `${order.orderNumber}-${Date.now().toString(36)}`.slice(0, 40),
    description: `Order ${order.orderNumber}`,
    expire_by: Math.floor(expiresAt.getTime() / 1000),
    customer: {
      name: order.customerName ?? order.user?.name ?? undefined,
      ...(contact ? { contact } : {}),
      ...(email ? { email } : {}),
    },
    // We send it ourselves (WhatsApp, or copied), so the gateway stays quiet.
    notify: { sms: false, email: false },
    reminder_enable: false,
    notes: { orderId: order.id, orderNumber: order.orderNumber },
  });

  await holdStockUntil(orderId, expiresAt);
  const row = await prisma.paymentLink.create({
    data: {
      orderId,
      kind: "LINK",
      gatewayId: created.id,
      url: created.short_url,
      amountCents: order.payment.amountCents,
      expiresAt,
      sentTo: contact ?? email ?? null,
      createdBy: actorId,
    },
  });
  return toView(row);
}

export async function createPaymentQr(orderId: string, actorId: string): Promise<PaymentLinkView> {
  const gateway = razorpayClient();
  if (!gateway) throw new DomainError("PAYMENT_FAILED", "Online payment is not set up yet");
  const order = await loadPayableOrder(orderId);

  const expiresAt = new Date(Date.now() + QR_EXPIRY_MINUTES * 60_000);
  await retireOpenLinks(orderId);
  const created = await gateway.client.qrCode.create({
    type: "upi_qr",
    name: `Order ${order.orderNumber}`,
    usage: "single_use",
    fixed_amount: true,
    payment_amount: order.payment.amountCents,
    description: `Order ${order.orderNumber}`,
    close_by: Math.floor(expiresAt.getTime() / 1000),
    notes: { orderId: order.id, orderNumber: order.orderNumber },
  });

  await holdStockUntil(orderId, expiresAt);
  const row = await prisma.paymentLink.create({
    data: {
      orderId,
      kind: "QR",
      gatewayId: created.id,
      url: created.image_url,
      amountCents: order.payment.amountCents,
      expiresAt,
      createdBy: actorId,
    },
  });
  return toView(row);
}

export async function cancelPaymentLink(linkId: string): Promise<PaymentLinkView> {
  const link = await prisma.paymentLink.findUnique({ where: { id: linkId } });
  if (!link) throw new DomainError("NOT_FOUND", "That payment link could not be found");
  if (link.status !== "CREATED") throw new DomainError("CONFLICT", "That payment link is no longer open");

  try {
    await closeOnGateway(link.kind, link.gatewayId);
  } catch {
    // The gateway refusing usually means it was just paid. Never mark a paid
    // link cancelled; the webhook will settle the truth.
    throw new DomainError("CONFLICT", "The gateway would not cancel it — it may have just been paid. Refresh to check.");
  }
  return toView(await prisma.paymentLink.update({ where: { id: linkId }, data: { status: "CANCELLED" } }));
}

export async function listPaymentLinks(orderId: string): Promise<PaymentLinkView[]> {
  const rows = await prisma.paymentLink.findMany({ where: { orderId }, orderBy: { createdAt: "desc" }, take: 20 });
  return rows.map(toView);
}
