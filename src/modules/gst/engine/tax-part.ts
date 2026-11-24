/**
 * The tax on one amount at one rate version.
 *
 * Exclusive prices: the amount IS the taxable value, and GST is added on top.
 * Inclusive prices: the amount already contains GST, which is taken back out.
 * Either way the buyer's payable amount is exact — rounding never moves the
 * total, it only moves a paisa between taxable value and tax.
 *
 * On an intra-state supply the tax is central + state (or union territory)
 * tax; on an inter-state supply it is integrated tax. The two always add to
 * the same total, which the rate master enforces (cgst + sgst = igst = rate).
 */
import { bpsOf, mulDivRound, splitInHalf } from "./money";
import type { RateVersion, SupplyType, TaxPart } from "./types";

/** Refuses a rate that does not add up, rather than quietly producing odd tax. */
export function assertConsistentRate(rate: RateVersion): void {
  const whole = [rate.rateBps, rate.cgstBps, rate.sgstBps, rate.igstBps, rate.cessBps];
  if (whole.some((value) => !Number.isInteger(value) || value < 0)) {
    throw new RangeError(`Rate ${rate.id} has an invalid component`);
  }
  if (rate.cgstBps + rate.sgstBps !== rate.rateBps || rate.igstBps !== rate.rateBps) {
    throw new RangeError(`Rate ${rate.id}: CGST + SGST and IGST must each equal the total rate`);
  }
}

export function computeTaxPart(
  amountCents: number,
  rate: RateVersion,
  pricesIncludeTax: boolean,
  supplyType: SupplyType,
): TaxPart {
  if (!Number.isInteger(amountCents) || amountCents < 0) {
    throw new RangeError("An amount must be a whole number of paise, not below zero");
  }
  assertConsistentRate(rate);

  const gstBps = supplyType === "INTRA_STATE" ? rate.cgstBps + rate.sgstBps : rate.igstBps;

  let taxableCents: number;
  let gstCents: number;
  let cessCents: number;
  if (pricesIncludeTax) {
    const denominator = 10_000 + gstBps + rate.cessBps;
    taxableCents = mulDivRound(amountCents, 10_000, denominator);
    const totalTax = amountCents - taxableCents;
    cessCents = Math.min(bpsOf(taxableCents, rate.cessBps), totalTax);
    gstCents = totalTax - cessCents;
  } else {
    taxableCents = amountCents;
    gstCents = bpsOf(taxableCents, gstBps);
    cessCents = bpsOf(taxableCents, rate.cessBps);
  }

  let cgstCents = 0;
  let sgstCents = 0;
  let igstCents = 0;
  if (supplyType === "INTER_STATE") {
    igstCents = gstCents;
  } else if (rate.cgstBps === rate.sgstBps) {
    [cgstCents, sgstCents] = splitInHalf(gstCents);
  } else {
    cgstCents = gstCents === 0 ? 0 : mulDivRound(gstCents, rate.cgstBps, gstBps);
    sgstCents = gstCents - cgstCents;
  }

  const taxCents = cgstCents + sgstCents + igstCents + cessCents;
  return {
    rate,
    taxableCents,
    cgstCents,
    sgstCents,
    igstCents,
    cessCents,
    taxCents,
    payableCents: pricesIncludeTax ? amountCents : amountCents + taxCents,
  };
}
