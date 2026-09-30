/**
 * What the client is short of — "Add 1 more from Bangles to get 3 for ₹999".
 *
 * Worked out from every piece in the cart that matches the offer, not only
 * the pieces left over after other offers, because the nudge is about what
 * the client could add, not about how this cart happened to be split.
 */
import type { EnginePromotion } from "../contracts";
import { matchesFilter, sumList, type Unit } from "./units";

export interface Shortfall {
  remainingQuantity?: number;
  remainingCents?: number;
}

function toNextMultiple(count: number, size: number): number {
  if (size < 1) return 0;
  const over = count % size;
  return over === 0 && count > 0 ? size : size - over;
}

export function shortfallFor(promotion: EnginePromotion, units: readonly Unit[]): Shortfall | null {
  const matching = units.filter((unit) => matchesFilter(unit.line, promotion.pieces));
  const n = matching.length;
  const repeats = promotion.maxApplicationsPerOrder === null || promotion.maxApplicationsPerOrder > 1;

  if (promotion.minQuantity !== null && n < promotion.minQuantity) {
    return { remainingQuantity: promotion.minQuantity - n };
  }
  if (promotion.minSubtotalCents !== null && sumList(matching) < promotion.minSubtotalCents) {
    return { remainingCents: promotion.minSubtotalCents - sumList(matching) };
  }

  const benefit = promotion.benefit;
  switch (benefit.type) {
    case "setPrice": {
      if (n < benefit.setSize) return { remainingQuantity: benefit.setSize - n };
      if (!repeats || n % benefit.setSize === 0) return null;
      return { remainingQuantity: toNextMultiple(n, benefit.setSize) };
    }
    case "setPriceTiers": {
      const sizes = benefit.tiers.map((tier) => tier.size).sort((a, b) => a - b);
      const next = sizes.find((size) => size > n);
      if (next !== undefined) return { remainingQuantity: next - n };
      if (benefit.leftovers === "FULL_PRICE" || sizes.length === 0) return null;
      // Beyond the largest set: how far to the next set of the smallest size.
      const leftover = n % sizes[sizes.length - 1];
      return leftover > 0 && leftover < sizes[0] ? { remainingQuantity: sizes[0] - leftover } : null;
    }
    case "reward": {
      if (benefit.gets) {
        if (n < benefit.buyQuantity) return { remainingQuantity: benefit.buyQuantity - n };
        const rewards = units.filter((unit) => matchesFilter(unit.line, benefit.gets!)).length;
        return rewards < benefit.getQuantity
          ? { remainingQuantity: benefit.getQuantity - rewards }
          : null;
      }
      const group = benefit.buyQuantity + benefit.getQuantity;
      if (n >= group && (!repeats || n % group === 0)) return null;
      return { remainingQuantity: toNextMultiple(n, group) };
    }
    case "percentTiers": {
      const measure = benefit.basis === "QUANTITY" ? n : sumList(matching);
      const next = [...benefit.tiers].sort((a, b) => a.min - b.min).find((t) => t.min > measure);
      if (!next) return null;
      return benefit.basis === "QUANTITY"
        ? { remainingQuantity: next.min - measure }
        : { remainingCents: next.min - measure };
    }
    case "bundle": {
      const have = benefit.components.map(
        (component) => units.filter((unit) => matchesFilter(unit.line, component.pieces)).length,
      );
      // Only worth saying once the client has started the bundle.
      if (have.every((count) => count === 0)) return null;
      const missing = benefit.components.reduce(
        (sum, component, index) => sum + Math.max(0, component.quantity - have[index]),
        0,
      );
      return missing > 0 ? { remainingQuantity: missing } : null;
    }
    default:
      return null;
  }
}
