/**
 * The UPI QR shown on the counter bill.
 *
 * A plain upi:// QR gives the shop no way of knowing it was paid: the cashier
 * confirms by eye from the customer's phone. A Razorpay QR is created for the
 * exact bill amount and used once, and Razorpay can be asked whether it was
 * paid — which turns "the cashier says so" into "the bank says so", and brings
 * back who paid and the bank reference without anyone typing them.
 *
 * Nothing here trusts the browser. When the sale is recorded the payment is
 * looked up again (verifyPosQrPayment), for the amount the sale is charging,
 * and a gateway payment can be applied to only one sale.
 */
import type Razorpay from "razorpay";
import { prisma } from "../../_shared/db";
import { DomainError } from "../../_shared/errors";
import { razorpayClient } from "./config";
import { describeInstrument } from "./payment-details";

/** Long enough to pay a bill, short enough that a forgotten QR does not stay live. */
export const POS_QR_MINUTES = 15;

type QrApi = Pick<Razorpay["qrCode"], "create" | "fetch" | "fetchAllPayments" | "close">;

export interface PosQr {
  qrId: string;
  imageUrl: string;
  expiresAt: string;
}

export type PosQrStatus =
  | { state: "WAITING" | "CLOSED" }
  | { state: "PAID"; gatewayPaymentId: string; amountCents: number; payerVpa: string | null; utr: string | null };

export interface VerifiedPosPayment {
  gatewayPaymentId: string;
  payerVpa: string | null;
  utr: string | null;
}

interface QrPayment {
  id: string;
  status?: string;
  amount?: number | string;
  vpa?: string;
}

function api(override?: QrApi): QrApi {
  if (override) return override;
  const gateway = razorpayClient();
  if (!gateway) throw new DomainError("PAYMENT_FAILED", "Online payment is not set up yet");
  return gateway.client.qrCode;
}

export async function createPosQr(amountCents: number, reference: string, override?: QrApi): Promise<PosQr> {
  if (!Number.isInteger(amountCents) || amountCents < 100) {
    throw new DomainError("VALIDATION_FAILED", "The amount is below the minimum the gateway accepts");
  }
  const expiresAt = new Date(Date.now() + POS_QR_MINUTES * 60_000);
  const created = await api(override).create({
    type: "upi_qr",
    name: `Counter ${reference}`.slice(0, 50),
    usage: "single_use",
    fixed_amount: true,
    payment_amount: amountCents,
    description: `LavIndia ${reference}`,
    close_by: Math.floor(expiresAt.getTime() / 1000),
    // `channel` is what lets this code refuse a QR that was made for something else.
    notes: { channel: "POS", reference },
  });
  return { qrId: created.id, imageUrl: created.image_url, expiresAt: expiresAt.toISOString() };
}

export async function checkPosQr(qrId: string, override?: QrApi): Promise<PosQrStatus> {
  const client = api(override);
  const qr = await client.fetch(qrId);
  // An order's QR, or anyone else's, must not be usable to pay for a counter sale.
  if ((qr.notes as Record<string, unknown> | undefined)?.channel !== "POS") {
    throw new DomainError("NOT_FOUND", "That QR could not be found");
  }
  const expected = Number(qr.payment_amount);
  const { items } = await client.fetchAllPayments(qrId);
  const paid = (items as unknown as QrPayment[]).find(
    (payment) => payment.status === "captured" && Number(payment.amount) === expected,
  );
  if (paid) {
    const instrument = describeInstrument(paid as Parameters<typeof describeInstrument>[0]);
    return { state: "PAID", gatewayPaymentId: paid.id, amountCents: expected, payerVpa: instrument.payerVpa, utr: instrument.utr };
  }
  return { state: qr.status === "closed" ? "CLOSED" : "WAITING" };
}

/** Throws unless the QR was genuinely paid, in full, and not already spent on another sale. */
export async function verifyPosQrPayment(
  qrId: string,
  expectedAmountCents: number,
  override?: QrApi,
): Promise<VerifiedPosPayment> {
  const status = await checkPosQr(qrId, override);
  if (status.state !== "PAID" || status.amountCents !== expectedAmountCents) {
    throw new DomainError("PAYMENT_NOT_VERIFIED", "That payment has not been received for this amount");
  }
  const spent = await prisma.payment.findUnique({
    where: { razorpayPaymentId: status.gatewayPaymentId },
    select: { id: true },
  });
  if (spent) throw new DomainError("CONFLICT", "That payment has already been used for another sale");
  return { gatewayPaymentId: status.gatewayPaymentId, payerVpa: status.payerVpa, utr: status.utr };
}

/** Best effort: a QR left open just closes itself at its deadline. */
export async function closePosQr(qrId: string, override?: QrApi): Promise<void> {
  try {
    const client = api(override);
    // Only a counter QR — never one made for an order.
    if (((await client.fetch(qrId)).notes as Record<string, unknown> | undefined)?.channel !== "POS") return;
    await client.close(qrId);
  } catch {
    // Already paid or closed.
  }
}
