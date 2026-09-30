/**
 * Buy X, get Y: "Buy 1 Get 1 Free", "Buy 2 Get 1 Free", "Buy 2 bangles, get
 * an earring free", "Buy a necklace, get earrings at 50%".
 *
 * The reward pieces are chosen across everything that qualifies — with
 * "cheapest free", the N cheapest pieces are the rewards, which is the norm
 * in Indian retail and easy to explain. The pieces bought to earn them are
 * the cheapest of what remains, so the dearest pieces stay free for any
 * other offer that could still apply to them.
 *
 * The reward is never added to the cart by the engine; a client who has not
 * picked it up is nudged to.
 */
import type { PieceFilter, RewardValue } from "../contracts";
import { percentOf } from "./allocate";
import { byPriceAsc, byPriceDesc, matchesFilter, type Unit } from "./units";
import type { Application, BenefitInput } from "./piece-benefits";

export interface RewardParams {
  buyQuantity: number;
  getQuantity: number;
  gets: PieceFilter | null;
  value: RewardValue;
  pick: "CHEAPEST" | "MOST_EXPENSIVE";
}

export function rewardDiscount(unit: Unit, value: RewardValue): number {
  switch (value.type) {
    case "percent":
      return Math.min(unit.listCents, percentOf(unit.listCents, value.bps));
    case "amountOff":
      return Math.min(unit.listCents, value.cents);
    case "fixedPrice":
      return Math.max(0, unit.listCents - value.cents);
  }
}

function pickRewards(pool: Unit[], count: number, pick: RewardParams["pick"]): Unit[] {
  return [...pool].sort(pick === "CHEAPEST" ? byPriceAsc : byPriceDesc).slice(0, count);
}

export function applyReward(input: BenefitInput, params: RewardParams): Application[] {
  const { buyQuantity: b, getQuantity: g } = params;
  if (b < 0 || g < 1) return [];

  const buyPool = input.matching;
  const getPool = params.gets
    ? input.available.filter((unit) => matchesFilter(unit.line, params.gets!))
    : buyPool;

  const most = params.gets
    ? Math.min(Math.floor(buyPool.length / Math.max(b, 1)), Math.floor(getPool.length / g))
    : Math.floor(buyPool.length / (b + g));

  for (let k = Math.min(most, input.maxApplications); k >= 1; k -= 1) {
    const rewards = pickRewards(getPool, k * g, params.pick);
    const buys = buyPool
      .filter((unit) => !rewards.includes(unit))
      .sort(byPriceAsc)
      .slice(0, k * b);
    if (buys.length < k * b) continue;

    // Pair them up for the record: application i is the i-th slice of each.
    const applications: Application[] = [];
    for (let i = 0; i < k; i += 1) {
      const rewardUnits = rewards.slice(i * g, (i + 1) * g);
      const buyUnits = buys.slice(i * b, (i + 1) * b);
      const discountCents = rewardUnits.reduce(
        (sum, unit) => sum + rewardDiscount(unit, params.value),
        0,
      );
      if (discountCents > 0) {
        applications.push({
          key: `reward-${i + 1}`,
          units: [...buyUnits, ...rewardUnits],
          discountCents,
        });
      }
    }
    return applications;
  }
  return [];
}
