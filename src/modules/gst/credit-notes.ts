/**
 * GST credit notes: refunding all or part of a sale at the tax that was charged.
 *
 * Each note reverses tax at the rate versions the invoice was issued under, in
 * proportion for a part-refund, with the refund that finishes a line taking
 * exactly what is left (engine/credit.ts). Notes are numbered from the same
 * series as the existing credit notes, so there is one unbroken run, and the
 * database refuses a note that would reverse more than the invoice charged.
 *
 * Recording the money going back is still done in Orders, as it always was;
 * a credit note is the tax document, not the payment.
 */
import type { Prisma } from "@prisma/client";
import { prisma, type Tx } from "../_shared/db";
import { DomainError } from "../_shared/errors";
import { allocateCreditNoteNumber } from "../billing/credit-notes/credit-note-number";
import { addCredited, creditNote, fullCredit, ZERO, type Components, type CreditLine, type InvoicedLine, type RefundRequest } from "./engine/credit";
import type { RateVersion } from "./engine/types";
import { engineMode } from "./state";
import { inSavepoint } from "./invoice-detail";

interface InvoiceLine extends Components {
  lineId: string;
  kind: "GOODS" | "SHIPPING" | "COD_FEE";
  description: string;
  code: string;
  codeKind: "HSN" | "SAC";
  rateVersionId: string;
  rateBps: number;
  cessBps: number;
}

const UNTAXED = "UNTAXED";

interface StoredCreditLine extends Components {
  lineId: string;
  kind: string;
  description?: string;
  code?: string;
  rateBps?: number;
  rateVersionId?: string;
  taxCents?: number;
}

export interface CreditRequest {
  /** FULL refunds everything still refundable; PARTIAL needs `refunds`. */
  mode: "FULL" | "PARTIAL";
  reason: string;
  refunds?: RefundRequest[];
  /** Part of an untaxed charge (such as delivery) sent back, in paise. */
  untaxedRefundCents?: number;
  refundReference?: string | null;
}

const rateOf = (line: InvoiceLine): RateVersion => ({
  id: line.rateVersionId, code: line.code, codeKind: line.codeKind, rateBps: line.rateBps,
  cgstBps: line.rateBps / 2, sgstBps: line.rateBps / 2, igstBps: line.rateBps, cessBps: line.cessBps,
});

const asInvoiced = (line: InvoiceLine): InvoicedLine => ({
  lineId: line.lineId, kind: line.kind, rate: rateOf(line),
  taxableCents: line.taxableCents, cgstCents: line.cgstCents, sgstCents: line.sgstCents, igstCents: line.igstCents, cessCents: line.cessCents, payableCents: line.payableCents,
});

function creditedSoFar(notes: Array<{ lines: unknown }>): { perLine: Map<string, Components>; untaxed: number } {
  let credited = new Map<string, Components>();
  let untaxed = 0;
  for (const note of notes) {
    for (const stored of note.lines as StoredCreditLine[]) {
      if (stored.lineId === UNTAXED) { untaxed += stored.payableCents; continue; }
      credited = addCredited(credited, [{ ...stored, taxCents: 0, finishesLine: false, rate: {} as RateVersion, kind: stored.kind as CreditLine["kind"] }]);
    }
  }
  return { perLine: credited, untaxed };
}

export async function issueGstCreditNote(orderId: string, request: CreditRequest, actorId: string) {
  if (!request.reason.trim()) throw new DomainError("VALIDATION_FAILED", "A credit note needs a reason");
  return prisma.$transaction(async (tx) => issueInTx(tx, orderId, request, actorId, null), { timeout: 20_000 });
}

async function issueInTx(tx: Tx, orderId: string, request: CreditRequest, actorId: string, reuse: { creditNoteNumber: string; financialYear: string; issuedAt: Date } | null) {
  const detail = await tx.gstInvoiceDetail.findUnique({ where: { orderId } });
  if (!detail) throw new DomainError("NOT_FOUND", "This order has no GST invoice, so there is nothing to credit under GST");

  // Same lock the database's cap trigger takes: two refunds on one invoice queue here.
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${"gst_credit_notes:" + detail.id}, 0))`;
  const previous = await tx.gstCreditNote.findMany({ where: { invoiceDetailId: detail.id }, select: { lines: true } });
  const { perLine, untaxed } = creditedSoFar(previous);

  const invoiceLines = detail.lines as unknown as InvoiceLine[];
  const invoiced = invoiceLines.map(asInvoiced);
  const result = request.mode === "FULL" ? fullCredit(invoiced, perLine) : creditNote(invoiced, perLine, request.refunds ?? []);

  const untaxedLeft = detail.untaxedChargesCents - untaxed;
  const untaxedRefund = request.mode === "FULL" ? untaxedLeft : (request.untaxedRefundCents ?? 0);
  if (untaxedRefund < 0 || untaxedRefund > untaxedLeft) throw new DomainError("VALIDATION_FAILED", `Only ${untaxedLeft} paise of untaxed charges can still be refunded`);
  if (result.lines.length === 0 && untaxedRefund === 0) throw new DomainError("VALIDATION_FAILED", "There is nothing left to credit on this invoice");

  const describe = new Map(invoiceLines.map((l) => [l.lineId, l]));
  const stored: Prisma.InputJsonValue[] = result.lines.map((l) => ({
    lineId: l.lineId, kind: l.kind, description: describe.get(l.lineId)?.description ?? l.lineId, code: l.rate.code, rateBps: l.rate.rateBps, rateVersionId: l.rate.id,
    taxableCents: l.taxableCents, cgstCents: l.cgstCents, sgstCents: l.sgstCents, igstCents: l.igstCents, cessCents: l.cessCents, taxCents: l.taxCents, payableCents: l.payableCents,
  }));
  if (untaxedRefund > 0) stored.push({ lineId: UNTAXED, kind: "UNTAXED", description: "Charges not subject to GST", taxableCents: 0, cgstCents: 0, sgstCents: 0, igstCents: 0, cessCents: 0, payableCents: untaxedRefund });

  const issuedAt = reuse?.issuedAt ?? new Date();
  const allocated = reuse ?? (await allocateCreditNoteNumber(tx, issuedAt));
  const t = result.totals;
  const row = await tx.gstCreditNote.create({
    data: {
      creditNoteNumber: allocated.creditNoteNumber,
      invoiceDetailId: detail.id,
      orderId,
      financialYear: allocated.financialYear,
      issuedAt,
      kind: request.mode === "FULL" ? "FULL" : "PARTIAL",
      reason: request.reason.trim(),
      lines: stored,
      taxableCents: t.taxableCents, cgstCents: t.cgstCents, sgstCents: t.sgstCents, igstCents: t.igstCents, cessCents: t.cessCents, totalTaxCents: t.taxCents,
      refundCents: t.payableCents + untaxedRefund,
      refundReference: request.refundReference ?? null,
      createdBy: actorId,
    },
  });
  return row;
}

/**
 * Called when the existing system issues its full credit note for a cancelled
 * order. Writes the matching GST credit note under the SAME number, so the two
 * are one document seen two ways. Never stops the existing credit note.
 */
export async function mirrorLegacyCreditNote(tx: Tx, args: { orderId: string; creditNoteNumber: string; financialYear: string; issuedAt: Date; reason: string; actorId: string | null }): Promise<void> {
  if ((await engineMode()) === "OFF") return;
  const has = await tx.gstInvoiceDetail.findUnique({ where: { orderId: args.orderId }, select: { id: true } });
  if (!has) return;
  await inSavepoint(tx, "gst_credit_mirror", () =>
    issueInTx(tx, args.orderId, { mode: "FULL", reason: args.reason }, args.actorId ?? "system", { creditNoteNumber: args.creditNoteNumber, financialYear: args.financialYear, issuedAt: args.issuedAt }),
  );
}

export async function listGstCreditNotes(orderId: string) {
  return prisma.gstCreditNote.findMany({ where: { orderId }, orderBy: { issuedAt: "asc" } });
}

/** What can still be refunded on an invoice, line by line — for the refund form. */
export async function refundableLines(orderId: string) {
  const detail = await prisma.gstInvoiceDetail.findUnique({ where: { orderId } });
  if (!detail) return null;
  const notes = await prisma.gstCreditNote.findMany({ where: { invoiceDetailId: detail.id }, select: { lines: true } });
  const { perLine, untaxed } = creditedSoFar(notes);
  return {
    invoiceNumber: detail.invoiceNumber,
    lines: (detail.lines as unknown as InvoiceLine[]).map((l) => ({
      lineId: l.lineId, description: l.description, payableCents: l.payableCents, creditedCents: (perLine.get(l.lineId) ?? ZERO).payableCents,
      remainingCents: l.payableCents - (perLine.get(l.lineId) ?? ZERO).payableCents,
    })),
    untaxedRemainingCents: detail.untaxedChargesCents - untaxed,
  };
}
