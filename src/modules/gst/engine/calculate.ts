/**
 * The GST calculation for one document: goods, delivery and cash-on-delivery
 * charges, each taxed at the rate version it was classified under.
 *
 * Nothing in here knows where a rate came from. A line with no rate cannot be
 * passed in at all, so there is no path by which an unclassified item is
 * quietly taxed at some default.
 */
import { allocateByWeight, sum } from "./money";
import { computeTaxPart } from "./tax-part";
import type {
  ChargeInput,
  GoodsLine,
  GstInput,
  GstResult,
  LineResult,
  RateSummaryRow,
  RateVersion,
  Totals,
} from "./types";

function highestRate(goods: readonly GoodsLine[]): RateVersion {
  return goods.reduce((best, line) =>
    line.rate.rateBps + line.rate.cessBps > best.rate.rateBps + best.rate.cessBps ? line : best,
  ).rate;
}

/** The parts a charge is taxed in, as [lineId, amount, rate] triples. */
function chargeParts(
  charge: ChargeInput,
  goods: readonly GoodsLine[],
  policy: NonNullable<GstInput["mixedBasketPolicy"]>,
): Array<[string, number, RateVersion]> {
  if (charge.treatment === "SEPARATE") {
    if (!charge.rate) throw new RangeError(`The ${charge.kind} charge is taxed separately but has no rate`);
    return [[charge.kind, charge.amountCents, charge.rate]];
  }
  if (goods.length === 0) {
    throw new RangeError(`The ${charge.kind} charge follows the goods, but there are none`);
  }
  const distinct = new Set(goods.map((line) => line.rate.id));
  if (distinct.size === 1 || policy === "HIGHEST_RATE") {
    return [[charge.kind, charge.amountCents, highestRate(goods)]];
  }
  const shares = allocateByWeight(charge.amountCents, goods.map((line) => line.amountCents));
  return goods.flatMap((line, index): Array<[string, number, RateVersion]> =>
    shares[index] > 0 ? [[`${charge.kind}:${line.lineId}`, shares[index], line.rate]] : [],
  );
}

function summarise(lines: readonly LineResult[]): RateSummaryRow[] {
  const rows = new Map<string, RateSummaryRow>();
  for (const line of lines) {
    const row = rows.get(line.rate.id) ?? {
      rateVersionId: line.rate.id,
      code: line.rate.code,
      rateBps: line.rate.rateBps,
      taxableCents: 0,
      cgstCents: 0,
      sgstCents: 0,
      igstCents: 0,
      cessCents: 0,
    };
    row.taxableCents += line.taxableCents;
    row.cgstCents += line.cgstCents;
    row.sgstCents += line.sgstCents;
    row.igstCents += line.igstCents;
    row.cessCents += line.cessCents;
    rows.set(line.rate.id, row);
  }
  return [...rows.values()];
}

export function calculateGst(input: GstInput): GstResult {
  const { supplyType, pricesIncludeTax, goods } = input;
  const policy = input.mixedBasketPolicy ?? "PROPORTIONAL";
  const lines: LineResult[] = [];

  for (const line of goods) {
    const part = computeTaxPart(line.amountCents, line.rate, pricesIncludeTax, supplyType);
    lines.push({ ...part, lineId: line.lineId, kind: "GOODS", inputCents: line.amountCents });
  }

  const untaxedCharges: GstResult["untaxedCharges"] = [];
  for (const charge of input.charges ?? []) {
    if (!Number.isInteger(charge.amountCents) || charge.amountCents < 0) {
      throw new RangeError(`The ${charge.kind} charge must be a whole number of paise`);
    }
    if (charge.amountCents === 0) continue;
    if (charge.treatment === "NONE") {
      untaxedCharges.push({ kind: charge.kind, amountCents: charge.amountCents });
      continue;
    }
    for (const [lineId, amountCents, rate] of chargeParts(charge, goods, policy)) {
      const part = computeTaxPart(amountCents, rate, pricesIncludeTax, supplyType);
      lines.push({ ...part, lineId, kind: charge.kind, inputCents: amountCents });
    }
  }

  const untaxed = sum(untaxedCharges.map((charge) => charge.amountCents));
  const totals: Totals = {
    taxableCents: sum(lines.map((l) => l.taxableCents)),
    cgstCents: sum(lines.map((l) => l.cgstCents)),
    sgstCents: sum(lines.map((l) => l.sgstCents)),
    igstCents: sum(lines.map((l) => l.igstCents)),
    cessCents: sum(lines.map((l) => l.cessCents)),
    taxCents: sum(lines.map((l) => l.taxCents)),
    payableCents: sum(lines.map((l) => l.payableCents)) + untaxed,
    untaxedChargesCents: untaxed,
  };

  return { supplyType, pricesIncludeTax, lines, totals, rateSummary: summarise(lines), untaxedCharges };
}
