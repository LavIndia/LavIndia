/**
 * The invoice payload.
 *
 * This shape is frozen into `Invoice.snapshot` at issue time and is the ONLY
 * thing the invoice renderer reads. That is what makes an old invoice
 * immutable by construction: reprinting a five-year-old bill cannot be
 * affected by a product being renamed, repriced or deleted, because the
 * renderer never touches the catalog at all.
 *
 * Tax is calculated in the Orders domain and carried here as numbers. Nothing
 * in the rendering layer computes GST — a template that does arithmetic is a
 * template that can disagree with the books.
 */

export interface InvoiceBusiness {
  name: string;
  address?: string | null;
  contactNumber?: string | null;
  email?: string | null;
  gstNumber?: string | null;
  website?: string | null;
}

export interface InvoiceCustomer {
  name?: string | null;
  mobile?: string | null;
  email?: string | null;
  gstin?: string | null;
  addressLines?: string[];
}

export interface InvoiceLine {
  position: number;
  description: string;
  variantName?: string | null;
  sku?: string | null;
  hsnCode?: string | null;
  quantity: number;
  unitPriceCents: number;
  /** List price, present only when it differs from what was charged. */
  catalogPriceCents?: number | null;
  discountCents: number;
  taxCents: number;
  taxRateBps: number;
  lineTotalCents: number;
}

export interface InvoiceTotals {
  subtotalCents: number;
  discountCents: number;
  taxCents: number;
  shippingCents: number;
  grandTotalCents: number;
}

export interface InvoicePayment {
  method: string;
  reference?: string | null;
  status: string;
  /**
   * The customer's UPI ID, when the sale was paid by UPI.
   *
   * On the INVOICE rather than the bill, deliberately: the bill is a request
   * for payment and cannot know who will pay it, while the invoice is the
   * record of a payment that has happened. "Paid by UPI" with no payer and no
   * reference is not something anyone can reconcile against a bank statement.
   */
  payerVpa?: string | null;
  /** UPI RRN / UTR — the bank's reference for the transfer. */
  utr?: string | null;
}

/** Everything the template needs, and nothing it must look up. */
export interface InvoiceSnapshot {
  invoiceNumber: string;
  issuedAt: string;
  orderNumber: string;
  /** ONLINE or STORE — the same template serves both. */
  source: string;
  business: InvoiceBusiness;
  customer: InvoiceCustomer;
  lines: InvoiceLine[];
  totals: InvoiceTotals;
  payment: InvoicePayment;
  /**
   * The closing line, chosen from a curated list and frozen here so a reprint
   * reproduces the same document rather than picking a new one.
   */
  greeting: string;
  /** Stated on the invoice so an internal code is never mistaken for a GTIN. */
  currency: "INR";
}
