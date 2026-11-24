/**
 * Credit notes: undoing all or part of a sale, at the tax that was charged.
 *
 * A refund reverses tax at the rate version the invoice was issued under —
 * never the rate in force today — so a credit note always cancels exactly the
 * tax it refers to. A part-refund takes its share of each component in
 * proportion; the refund that finishes a line takes exactly what is left of
 * it, so a line refunded in several pieces never drifts by a paisa.
 */
import { mulDivRound, sum } from "./money";
import type { LineResult, RateVersion } from "./types";

/** The components of one invoiced line (or of what has been credited against it). */
export interface Components {
  taxableCents: number;
  cgstCents: number;
  sgstCents: number;
  igstCents: number;
  cessCents: number;
  payableCents: number;
}

export interface InvoicedLine extends Components {
  lineId: string;
  kind: LineResult["kind"];
  rate: RateVersion;
}

export interface RefundRequest {
  lineId: string;
  /** What the buyer gets back for this line, tax included. */
  refundCents: number;
}

export interface CreditLine extends Components {
  lineId: string;
  kind: LineResult["kind"];
  rate: RateVersion;
  taxCents: number;
  /** True when this credit uses up the line. */
  finishesLine: boolean;
}

export const ZERO: Components = {
  taxableCents: 0,
  cgstCents: 0,
  sgstCents: 0,
  igstCents: 0,
  cessCents: 0,
  payableCents: 0,
};

const KEYS = ["taxableCents", "cgstCents", "sgstCents", "igstCents", "cessCents", "payableCents"] as const;

function remaining(line: Components, credited: Components): Components {
  const left = { ...ZERO };
  for (const key of KEYS) left[key] = line[key] - credited[key];
  return left;
}

export function creditLine(
  line: InvoicedLine,
  creditedSoFar: Components,
  refundCents: number,
): CreditLine {
  if (!Number.isInteger(refundCents) || refundCents <= 0) {
    throw new RangeError("A refund must be a whole number of paise above zero");
  }
  const left = remaining(line, creditedSoFar);
  if (refundCents > left.payableCents) {
    throw new RangeError(
      `Line ${line.lineId}: refund of ${refundCents} is more than the ${left.payableCents} still refundable`,
    );
  }

  const taxCents = (c: Components) => c.cgstCents + c.sgstCents + c.igstCents + c.cessCents;

  if (refundCents === left.payableCents) {
    return { ...left, lineId: line.lineId, kind: line.kind, rate: line.rate, taxCents: taxCents(left), finishesLine: true };
  }

  // Tax first, in proportion to the original line and never more than is left
  // of it; the taxable value is whatever completes the refunded amount.
  const share = (original: number, cap: number) =>
    Math.min(mulDivRound(original, refundCents, line.payableCents), cap);
  const cgstCents = share(line.cgstCents, left.cgstCents);
  const sgstCents = share(line.sgstCents, left.sgstCents);
  const igstCents = share(line.igstCents, left.igstCents);
  const cessCents = share(line.cessCents, left.cessCents);
  const taxableCents = refundCents - cgstCents - sgstCents - igstCents - cessCents;
  if (taxableCents < 0 || taxableCents > left.taxableCents) {
    throw new RangeError(`Line ${line.lineId}: this refund cannot be split into taxable value and tax`);
  }

  return {
    lineId: line.lineId,
    kind: line.kind,
    rate: line.rate,
    taxableCents,
    cgstCents,
    sgstCents,
    igstCents,
    cessCents,
    payableCents: refundCents,
    taxCents: cgstCents + sgstCents + igstCents + cessCents,
    finishesLine: false,
  };
}

export function creditNote(
  invoiced: readonly InvoicedLine[],
  credited: ReadonlyMap<string, Components>,
  refunds: readonly RefundRequest[],
): { lines: CreditLine[]; totals: Components & { taxCents: number } } {
  const byId = new Map(invoiced.map((line) => [line.lineId, line]));
  const seen = new Set<string>();
  const lines = refunds.map((request) => {
    const line = byId.get(request.lineId);
    if (!line) throw new RangeError(`Refund names a line that is not on the invoice: ${request.lineId}`);
    if (seen.has(request.lineId)) throw new RangeError(`Line ${request.lineId} appears twice in one credit note`);
    seen.add(request.lineId);
    return creditLine(line, credited.get(request.lineId) ?? ZERO, request.refundCents);
  });
  const totals = { ...ZERO, taxCents: 0 };
  for (const key of KEYS) totals[key] = sum(lines.map((l) => l[key]));
  totals.taxCents = sum(lines.map((l) => l.taxCents));
  return { lines, totals };
}

/** Refunds everything still refundable on the invoice. */
export function fullCredit(invoiced: readonly InvoicedLine[], credited: ReadonlyMap<string, Components>) {
  const refunds = invoiced
    .map((line) => ({
      lineId: line.lineId,
      refundCents: line.payableCents - (credited.get(line.lineId)?.payableCents ?? 0),
    }))
    .filter((request) => request.refundCents > 0);
  return creditNote(invoiced, credited, refunds);
}

/** Adds a credit note's lines into the running credited total per line. */
export function addCredited(
  credited: Map<string, Components>,
  lines: readonly CreditLine[],
): Map<string, Components> {
  const next = new Map(credited);
  for (const line of lines) {
    const current = next.get(line.lineId) ?? { ...ZERO };
    const updated = { ...current };
    for (const key of KEYS) updated[key] = current[key] + line[key];
    next.set(line.lineId, updated);
  }
  return next;
}
