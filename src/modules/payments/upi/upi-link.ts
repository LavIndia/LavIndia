/**
 * UPI payment links.
 *
 * A UPI QR is nothing more than a deep link encoded as a QR code. The scheme
 * is fixed by NPCI and every app — GPay, PhonePe, Paytm — reads the same
 * thing, so there is no per-app integration to write:
 *
 *     upi://pay?pa=<vpa>&pn=<name>&am=<amount>&cu=INR&tn=<note>&tr=<ref>
 *
 * We always build a DYNAMIC link, with the amount included. A static QR — the
 * printed sticker by the till — makes the customer type the amount, which
 * means a mistyped ₹164 for ₹1,646 is discovered only at reconciliation. With
 * a screen at the counter there is no reason to accept that.
 *
 * A rendered QR is also immune to the sticker-swap fraud that signed UPI 2.0
 * QRs exist to prevent, because there is no physical code for anyone to cover.
 */
import { DomainError } from "../../_shared/errors";

export interface UpiPayee {
  /** The Virtual Payment Address, e.g. lavindia@okhdfcbank. */
  vpa: string;
  /** The name the customer sees in their UPI app before confirming. */
  name: string;
}

export interface UpiPaymentRequest {
  payee: UpiPayee;
  amountCents: number;
  /**
   * Short description. NPCI marks this mandatory for merchant transactions,
   * so the invoice number goes here — it is also what the customer will see.
   */
  note: string;
  /** Reference for reconciliation, typically the order number. */
  reference?: string;
}

/**
 * A VPA looks like an email address but is not one; the handle is a bank or
 * PSP identifier. Validated because a typo here sends money to a stranger.
 */
const VPA_PATTERN = /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z][a-zA-Z0-9.]{1,63}$/;

export function isValidVpa(vpa: string): boolean {
  return VPA_PATTERN.test(vpa.trim());
}

/** Rupees with exactly two decimals, which is what the `am` field requires. */
function formatAmount(amountCents: number): string {
  return (amountCents / 100).toFixed(2);
}

/**
 * Builds the deep link.
 *
 * Every value is URI-encoded: a payee name with an ampersand in it would
 * otherwise silently truncate the query and produce a link that pays the
 * right person the wrong amount.
 */
export function buildUpiLink(request: UpiPaymentRequest): string {
  const vpa = request.payee.vpa.trim();

  if (!isValidVpa(vpa)) {
    throw new DomainError("VALIDATION_FAILED", "That UPI ID does not look valid", { vpa });
  }
  if (!Number.isInteger(request.amountCents) || request.amountCents <= 0) {
    throw new DomainError("VALIDATION_FAILED", "A UPI request needs a positive amount");
  }

  const params = new URLSearchParams({
    pa: vpa,
    pn: request.payee.name.trim(),
    am: formatAmount(request.amountCents),
    cu: "INR",
    tn: request.note.trim(),
  });

  if (request.reference?.trim()) {
    params.set("tr", request.reference.trim());
  }

  return `upi://pay?${params.toString()}`;
}

/**
 * The same details rendered for a human, for the line printed beside the QR.
 * Someone whose camera will not focus can still pay by typing the VPA.
 */
export function upiPayeeSummary(payee: UpiPayee): string {
  return `${payee.name} · ${payee.vpa}`;
}
