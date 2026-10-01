/**
 * Credit notes: the GST-correct way to undo a sale that was already billed.
 *
 * An issued invoice is never edited or deleted — it stays ISSUED for good.
 * When its order is cancelled or refunded, a credit note for the whole
 * invoice is issued instead, on its own financial-year sequence, and the two
 * documents together show the sale and its reversal.
 *
 * One credit note per invoice. The caller holds the order's row lock
 * (orders/order-status), so a cancel and a refund pressed together, or a
 * refund after a cancel, find the first note rather than issuing a second.
 */
import { prisma, type Tx } from "../../_shared/db";
import type { InvoiceSnapshot } from "../invoices/invoice-types";
import { allocateCreditNoteNumber } from "./credit-note-number";
import type { CreditNoteSnapshot, IssuedCreditNote } from "./credit-note-types";

const SUMMARY = { id: true, creditNoteNumber: true, snapshot: true } as const;

function toIssued(row: { id: string; creditNoteNumber: string; snapshot: unknown }): IssuedCreditNote {
  return {
    creditNoteId: row.id,
    creditNoteNumber: row.creditNoteNumber,
    snapshot: row.snapshot as CreditNoteSnapshot,
  };
}

/**
 * Credits an order's invoice in full, inside the caller's transaction.
 *
 * Returns null when the order was never billed — an unpaid gateway order or
 * a cash-on-delivery order cancelled before dispatch has nothing to credit.
 * A repeat returns the note already issued.
 */
export async function issueCreditNoteForOrder(
  tx: Tx,
  orderId: string,
  reason: string,
  actorId?: string,
): Promise<IssuedCreditNote | null> {
  const invoice = await tx.invoice.findUnique({
    where: { orderId },
    select: {
      id: true,
      snapshot: true,
      creditNotes: { select: SUMMARY, take: 1 },
    },
  });
  if (!invoice) return null;
  if (invoice.creditNotes[0]) return toIssued(invoice.creditNotes[0]);

  const billed = invoice.snapshot as unknown as InvoiceSnapshot;
  const issuedAt = new Date();
  const allocated = await allocateCreditNoteNumber(tx, issuedAt);

  // Everything is copied from the invoice's frozen snapshot — the same
  // seller, buyer, lines, GST and totals — so the note reverses exactly
  // what was billed, whatever has changed in the catalog or settings since.
  const snapshot: CreditNoteSnapshot = {
    creditNoteNumber: allocated.creditNoteNumber,
    issuedAt: issuedAt.toISOString(),
    reason,
    invoice: { invoiceNumber: billed.invoiceNumber, issuedAt: billed.issuedAt },
    orderNumber: billed.orderNumber,
    source: billed.source,
    business: billed.business,
    customer: billed.customer,
    lines: billed.lines,
    totals: billed.totals,
    currency: "INR",
  };

  const created = await tx.creditNote.create({
    data: {
      creditNoteNumber: allocated.creditNoteNumber,
      invoiceId: invoice.id,
      orderId,
      financialYear: allocated.financialYear,
      sequence: allocated.sequence,
      reason,
      issuedAt,
      subtotalCents: billed.totals.subtotalCents,
      discountCents: billed.totals.discountCents,
      taxCents: billed.totals.taxCents,
      totalCents: billed.totals.grandTotalCents,
      snapshot: snapshot as unknown as object,
      createdBy: actorId ?? null,
    },
    select: SUMMARY,
  });
  return toIssued(created);
}

/** The credit note against an order's invoice, if one was issued. */
export async function getCreditNoteByOrder(orderId: string): Promise<IssuedCreditNote | null> {
  const row = await prisma.creditNote.findFirst({
    where: { orderId },
    select: SUMMARY,
    orderBy: { issuedAt: "asc" },
  });
  return row ? toIssued(row) : null;
}
