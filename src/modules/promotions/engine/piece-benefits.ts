/**
 * Piece offers that price each matching piece on its own: a percentage off,
 * an amount off, a fixed price per piece, and percentage tiers.
 *
 * Each returns APPLICATIONS — the units it used and what it took off them.
 * Units not named in an application stay free for other offers.
 */
import type { EngineContext, EnginePromotion } from "../contracts";
import { percentOf } from "./allocate";
import { sumList, type Unit } from "./units";

export interface Application {
  /** Groups the units of one application, e.g. "set-1". */
  key: string;
  units: Unit[];
  discountCents: number;
}

export interface BenefitInput {
  promotion: EnginePromotion;
  /** Units still free that match the promotion's pieces, dearest first. */
  matching: Unit[];
  /** Every unit still free, dearest first — for rewards and bundles, whose
   *  pieces are chosen by their own filters. */
  available: Unit[];
  context: EngineContext;
  /** How many applications are allowed; Infinity when unlimited. */
  maxApplications: number;
}

function perUnit(
  units: readonly Unit[],
  maxApplications: number,
  discountFor: (unit: Unit) => number,
): Application[] {
  const applications: Application[] = [];
  for (const unit of units) {
    if (applications.length >= maxApplications) break;
    const discountCents = Math.min(unit.listCents, Math.max(0, discountFor(unit)));
    if (discountCents > 0) {
      applications.push({ key: `piece-${applications.length + 1}`, units: [unit], discountCents });
    }
  }
  return applications;
}

export function applyPercentOff(input: BenefitInput, bps: number): Application[] {
  return perUnit(input.matching, input.maxApplications, (unit) => percentOf(unit.listCents, bps));
}

export function applyAmountOffEach(input: BenefitInput, cents: number): Application[] {
  return perUnit(input.matching, input.maxApplications, () => cents);
}

export function applyFixedPriceEach(input: BenefitInput, cents: number): Application[] {
  return perUnit(input.matching, input.maxApplications, (unit) => unit.listCents - cents);
}

/**
 * "Buy 2, get 10%; buy 3, get 15%" — the tier reached by the matching pieces
 * sets the percentage for all of them.
 */
export function applyPercentTiers(
  input: BenefitInput,
  basis: "QUANTITY" | "SUBTOTAL",
  tiers: readonly { min: number; bps: number }[],
): Application[] {
  const measure = basis === "QUANTITY" ? input.matching.length : sumList(input.matching);
  const reached = [...tiers].sort((a, b) => b.min - a.min).find((tier) => measure >= tier.min);
  if (!reached) return [];
  return applyPercentOff(input, reached.bps);
}

/** Whether the promotion's own minimums are met by the units it could use. */
export function meetsMinimums(promotion: EnginePromotion, matching: readonly Unit[]): boolean {
  if (promotion.minQuantity !== null && matching.length < promotion.minQuantity) return false;
  if (promotion.minSubtotalCents !== null && sumList(matching) < promotion.minSubtotalCents) {
    return false;
  }
  return true;
}

export function netPrice(promotion: EnginePromotion, context: EngineContext, cents: number) {
  return promotion.priceIncludesTax
    ? Math.round((cents * 10_000) / (10_000 + context.taxRateBps))
    : cents;
}
