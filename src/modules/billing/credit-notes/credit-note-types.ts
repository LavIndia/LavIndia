/**
 * The credit note payload.
 *
 * Frozen into `CreditNote.snapshot` at issue time and the ONLY thing the
 * credit note renderer reads, exactly as the invoice works. It mirrors the
 * invoice it cancels — the same lines, the same GST per line, the same
 * totals — copied from that invoice's own frozen snapshot rather than from
 * the order, so the two documents cannot disagree about what was billed.
 */
import type {
  InvoiceBusiness,
  InvoiceCustomer,
  InvoiceLine,
  InvoiceTotals,
} from "../invoices/invoice-types";

/** The invoice a credit note cancels, as it is printed on the note. */
export interface CreditedInvoice {
  invoiceNumber: string;
  issuedAt: string;
}

export interface CreditNoteSnapshot {
  creditNoteNumber: string;
  issuedAt: string;
  /** "Order cancelled" or "Order refunded". */
  reason: string;
  invoice: CreditedInvoice;
  orderNumber: string;
  /** ONLINE or STORE, carried over from the invoice. */
  source: string;
  business: InvoiceBusiness;
  customer: InvoiceCustomer;
  lines: InvoiceLine[];
  totals: InvoiceTotals;
  currency: "INR";
}

/** A credit note as the rest of the app sees it. */
export interface IssuedCreditNote {
  creditNoteId: string;
  creditNoteNumber: string;
  snapshot: CreditNoteSnapshot;
}
