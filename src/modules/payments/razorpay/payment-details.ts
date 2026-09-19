/**
 * What the customer actually paid with.
 *
 * Razorpay tells the browser only that a payment succeeded. Which instrument
 * carried it — which card, which UPI handle, which bank — lives on the payment
 * entity and has to be asked for. Without it every gateway sale reads the same
 * generic "Card / UPI online", which is no use when reconciling a statement or
 * answering a customer asking how they paid.
 *
 * Fetched once, at verification, and frozen on the payment row: the answer
 * never changes, and a screen should not call a payment provider to render a
 * list.
 *
 * Server-only — it uses the secret key.
 */

const RAZORPAY_API = "https://api.razorpay.com/v1";

/** The subset of Razorpay's payment entity this needs. */
interface RazorpayPayment {
  method?: string;
  vpa?: string;
  bank?: string;
  wallet?: string;
  card?: { last4?: string; network?: string; issuer?: string; type?: string };
  acquirer_data?: {
    rrn?: string;
    upi_transaction_id?: string;
    bank_transaction_id?: string;
  };
}

export interface PaymentInstrument {
  /** card, upi, netbanking, wallet, emi — as the gateway names it. */
  method: string | null;
  /** The instrument in the customer's words, or null when not knowable. */
  instrumentDetail: string | null;
  /** The payer's UPI handle, when they paid by UPI. */
  payerVpa: string | null;
  /** The bank reference for the transfer, for reconciliation. */
  utr: string | null;
}

/** Nothing known — used whenever the lookup cannot be made or fails. */
const UNKNOWN: PaymentInstrument = {
  method: null,
  instrumentDetail: null,
  payerVpa: null,
  utr: null,
};

/** Title case for gateway codes like `HDFC` or `airtelmoney`. */
function prettify(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase())
    .trim();
}

/**
 * A payment entity → the instrument, phrased for a human.
 *
 * Exported separately from the fetch so the phrasing can be reasoned about
 * and tested without a network call.
 */
export function describeInstrument(payment: RazorpayPayment): PaymentInstrument {
  const method = payment.method ?? null;
  const acquirer = payment.acquirer_data ?? {};
  const utr =
    acquirer.upi_transaction_id ?? acquirer.rrn ?? acquirer.bank_transaction_id ?? null;

  let instrumentDetail: string | null = null;

  switch (method) {
    case "upi":
      // The handle IS the instrument, so it is not repeated as a detail.
      instrumentDetail = payment.vpa ?? "UPI";
      break;
    case "card": {
      const card = payment.card ?? {};
      // Issuer and last four are what a customer recognises on a statement;
      // the network is the fallback when the issuer is not disclosed.
      const issuer = card.issuer ? prettify(card.issuer) : card.network ?? "Card";
      instrumentDetail = card.last4 ? `${issuer} •••• ${card.last4}` : issuer;
      break;
    }
    case "netbanking":
      instrumentDetail = payment.bank ? `Net banking · ${prettify(payment.bank)}` : "Net banking";
      break;
    case "wallet":
      instrumentDetail = payment.wallet ? prettify(payment.wallet) : "Wallet";
      break;
    default:
      instrumentDetail = method ? prettify(method) : null;
  }

  return {
    method,
    instrumentDetail,
    payerVpa: payment.vpa ?? null,
    utr,
  };
}

/**
 * Ask Razorpay what a payment was made with.
 *
 * Never throws. This runs inside payment verification, where the money has
 * already moved and the signature has already been checked — failing the sale
 * because a descriptive lookup timed out would be the wrong trade entirely.
 * A failure simply leaves the fields null and the order still completes.
 */
export async function fetchPaymentInstrument(
  razorpayPaymentId: string,
): Promise<PaymentInstrument> {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return UNKNOWN;

  try {
    const credentials = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    const response = await fetch(`${RAZORPAY_API}/payments/${razorpayPaymentId}`, {
      headers: { Authorization: `Basic ${credentials}` },
      // Bounded, because it sits on the path between paying and being told
      // the order went through.
      signal: AbortSignal.timeout(5_000),
      cache: "no-store",
    });
    if (!response.ok) return UNKNOWN;
    return describeInstrument((await response.json()) as RazorpayPayment);
  } catch {
    return UNKNOWN;
  }
}
