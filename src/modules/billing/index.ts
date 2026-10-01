/**
 * Billing module — public surface.
 *
 * Consumes completed orders. Owns invoice identity, financial-year numbering
 * and the frozen render payload — never products, stock or catalog pricing.
 */
export type { BillingPort, IssuedInvoice } from "./billing-service";
export { billingService } from "./billing-service";
export type {
  InvoiceSnapshot,
  InvoiceLine,
  InvoiceTotals,
  InvoiceCustomer,
  InvoiceBusiness,
  InvoicePayment,
} from "./invoices/invoice-types";
export {
  financialYearFor,
  formatInvoiceNumber,
  allocateInvoiceNumber,
} from "./invoices/invoice-number";
export { INVOICE_GREETINGS, greetingForInvoiceNumber } from "./invoices/greetings";
export type {
  CreditNoteSnapshot,
  CreditedInvoice,
  IssuedCreditNote,
} from "./credit-notes/credit-note-types";
export {
  issueCreditNoteForOrder,
  getCreditNoteByOrder,
} from "./credit-notes/credit-note-service";
export {
  allocateCreditNoteNumber,
  formatCreditNoteNumber,
} from "./credit-notes/credit-note-number";
