/**
 * Order offers — coupons, "₹500 off above ₹5,000", "10% off the order" —
 * and delivery offers.
 *
 * An order offer comes off what the client is paying AFTER piece offers, and
 * is then spread back across the pieces it covered in proportion to what each
 * is being sold for, so every line still carries its true taxable value.
 */
import type { EnginePromotion } from "../contracts";
import { allocateProportionally, percentOf } from "./allocate";
import { matchesFilter, type Unit } from "./units";

export interface PricedUnit {
  unit: Unit;
  /** What the unit sells for after piece offers. */
  netCents: number;
}

export interface OrderOutcome {
  /** Parallel to the `eligible` units passed in. */
  shares: number[];
  eligible: PricedUnit[];
  totalCents: number;
  /** For a nudge when a threshold is not yet met. */
  remainingCents?: number;
}

function orderDiscount(
  promotion: EnginePromotion,
  subtotal: number,
): { cents: number; remainingCents?: number } {
  const benefit = promotion.benefit;
  switch (benefit.type) {
    case "amountOffOrder":
      return { cents: Math.min(benefit.cents, subtotal) };
    case "percentOffOrder":
      return { cents: percentOf(subtotal, benefit.bps) };
    case "orderTiers": {
      const sorted = [...benefit.tiers].sort((a, b) => a.minSubtotalCents - b.minSubtotalCents);
      const reached = [...sorted].reverse().find((tier) => subtotal >= tier.minSubtotalCents);
      const next = sorted.find((tier) => subtotal < tier.minSubtotalCents);
      const remainingCents = next ? next.minSubtotalCents - subtotal : undefined;
      if (!reached) return { cents: 0, remainingCents };
      const cents =
        reached.amountOffCents != null
          ? reached.amountOffCents
          : percentOf(subtotal, reached.bps ?? 0);
      return { cents: Math.min(cents, subtotal), remainingCents };
    }
    default:
      return { cents: 0 };
  }
}

export function applyOrderOffer(
  promotion: EnginePromotion,
  priced: readonly PricedUnit[],
): OrderOutcome {
  const eligible = priced.filter(
    (entry) => entry.netCents > 0 && matchesFilter(entry.unit.line, promotion.pieces),
  );
  const subtotal = eligible.reduce((sum, entry) => sum + entry.netCents, 0);
  const none = { shares: eligible.map(() => 0), eligible, totalCents: 0 };

  if (promotion.minQuantity !== null && eligible.length < promotion.minQuantity) return none;
  if (promotion.minSubtotalCents !== null && subtotal < promotion.minSubtotalCents) {
    return { ...none, remainingCents: promotion.minSubtotalCents - subtotal };
  }

  const { cents, remainingCents } = orderDiscount(promotion, subtotal);
  const capped = Math.min(
    cents,
    promotion.maxDiscountCents ?? Number.POSITIVE_INFINITY,
    subtotal,
  );
  if (capped <= 0) return { ...none, remainingCents };

  const shares = allocateProportionally(
    capped,
    eligible.map((entry) => ({ weight: entry.netCents, priority: entry.unit.listCents })),
  );
  return { shares, eligible, totalCents: capped, remainingCents };
}

/** Free delivery, when the order clears the offer's own minimums. */
export function deliverySaving(
  promotion: EnginePromotion,
  priced: readonly PricedUnit[],
  shippingCents: number,
): { cents: number; remainingCents?: number } {
  const eligible = priced.filter((entry) => matchesFilter(entry.unit.line, promotion.pieces));
  const subtotal = eligible.reduce((sum, entry) => sum + entry.netCents, 0);
  if (promotion.minQuantity !== null && eligible.length < promotion.minQuantity) return { cents: 0 };
  if (promotion.minSubtotalCents !== null && subtotal < promotion.minSubtotalCents) {
    return { cents: 0, remainingCents: promotion.minSubtotalCents - subtotal };
  }
  return { cents: shippingCents };
}
