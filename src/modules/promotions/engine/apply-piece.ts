/**
 * Runs one piece offer against the units still free, and caps what it gives.
 */
import type { EngineContext, EnginePromotion } from "../contracts";
import { allocateProportionally } from "./allocate";
import {
  applyAmountOffEach,
  applyFixedPriceEach,
  applyPercentOff,
  applyPercentTiers,
  meetsMinimums,
  netPrice,
  type Application,
  type BenefitInput,
} from "./piece-benefits";
import { applyBundle, applySetPrice, applySetPriceTiers } from "./set-benefits";
import { applyReward } from "./reward-benefit";
import { matchesFilter, type Unit } from "./units";

function runBenefit(input: BenefitInput): Application[] {
  const { promotion, context } = input;
  const benefit = promotion.benefit;
  const net = (cents: number) => netPrice(promotion, context, cents);

  switch (benefit.type) {
    case "percentOff":
      return applyPercentOff(input, benefit.bps);
    case "amountOffEach":
      return applyAmountOffEach(input, benefit.cents);
    case "fixedPriceEach":
      return applyFixedPriceEach(input, net(benefit.cents));
    case "percentTiers":
      return applyPercentTiers(input, benefit.basis, benefit.tiers);
    case "setPrice":
      return applySetPrice(input, benefit.setSize, net(benefit.priceCents));
    case "setPriceTiers":
      return applySetPriceTiers(
        input,
        benefit.tiers.map((tier) => ({ size: tier.size, priceCents: net(tier.priceCents) })),
        benefit.leftovers,
      );
    case "reward":
      return applyReward(input, {
        ...benefit,
        value:
          benefit.value.type === "fixedPrice"
            ? { type: "fixedPrice", cents: net(benefit.value.cents) }
            : benefit.value,
      });
    case "bundle":
      return applyBundle(input, benefit.components, net(benefit.priceCents));
    default:
      // Order and delivery offers are not piece offers.
      return [];
  }
}

/**
 * Holds an offer to its per-order cap by scaling every application down in
 * proportion, so the cap never lands arbitrarily on one piece.
 */
export function capApplications(applications: Application[], capCents: number | null) {
  if (capCents === null) return applications;
  const total = applications.reduce((sum, a) => sum + a.discountCents, 0);
  if (total <= capCents) return applications;

  const shares = allocateProportionally(
    capCents,
    applications.map((a, index) => ({ weight: a.discountCents, priority: -index })),
  );
  return applications
    .map((application, index) => ({ ...application, discountCents: shares[index] }))
    .filter((application) => application.discountCents > 0);
}

export function applyPieceOffer(
  promotion: EnginePromotion,
  available: readonly Unit[],
  context: EngineContext,
): Application[] {
  const matching = available.filter((unit) => matchesFilter(unit.line, promotion.pieces));
  if (!meetsMinimums(promotion, matching)) return [];

  const applications = runBenefit({
    promotion,
    matching,
    available: [...available],
    context,
    maxApplications: promotion.maxApplicationsPerOrder ?? Number.POSITIVE_INFINITY,
  });
  return capApplications(applications, promotion.maxDiscountCents);
}

export function savingOf(applications: readonly Application[]): number {
  return applications.reduce((sum, application) => sum + application.discountCents, 0);
}
