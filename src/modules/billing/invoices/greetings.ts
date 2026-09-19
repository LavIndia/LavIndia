/**
 * Curated closing greetings printed on the invoice.
 *
 * A fixed, reviewed list rather than generated text: nothing unvetted should
 * ever reach a customer's bill. Lines are written for someone who has just
 * bought fine jewellery — warm and personal, never salesy, never exclamatory,
 * and short enough to sit on one line under "Thank You".
 *
 * The selection is deterministic (derived from the invoice number) and the
 * chosen line is frozen into the invoice snapshot at issue time, so
 * reprinting an old invoice reproduces it exactly.
 */

export const INVOICE_GREETINGS = [
  "It was a pleasure to have you with us.",
  "May this piece mark many beautiful occasions.",
  "Thank you for letting us be part of your story.",
  "Wear it well, and wear it often.",
  "Every piece leaves us hoping it is loved for a lifetime.",
  "We are honoured by your trust.",
  "Here is to the moments this will be worn for.",
  "Chosen with care, and sent with warmth.",
  "Thank you for choosing something made to last.",
  "May it be admired as often as it is worn.",
  "Crafted slowly, for someone with an eye for it.",
  "Until the next occasion — our very warmest wishes.",
] as const;

export type InvoiceGreeting = (typeof INVOICE_GREETINGS)[number];

/**
 * Picks a greeting from the invoice number so a given invoice always shows
 * the same line, while consecutive invoices differ. A plain hash is enough
 * here — this is presentation, not security.
 */
export function greetingForInvoiceNumber(invoiceNumber: string): InvoiceGreeting {
  let hash = 0;
  for (let i = 0; i < invoiceNumber.length; i++) {
    hash = (hash * 31 + invoiceNumber.charCodeAt(i)) | 0;
  }
  const index = Math.abs(hash) % INVOICE_GREETINGS.length;
  return INVOICE_GREETINGS[index];
}
