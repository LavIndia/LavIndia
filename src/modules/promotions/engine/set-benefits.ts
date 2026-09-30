/**
 * Offers that price pieces TOGETHER: "Any 3 for ₹999", tiered set prices,
 * and bundles of named kinds of piece ("Necklace + Earrings for ₹1,499").
 */
import type { BundleComponent, PriceTier } from "../contracts";
import { matchesFilter, sumList, type Unit } from "./units";
import type { Application, BenefitInput } from "./piece-benefits";

/**
 * Chooses the sets that leave the client paying least.
 *
 * Largest-tier-first is not good enough: five pieces at ₹599 with tiers
 * 3→₹999 and 4→₹1,299 cost ₹1,898 as a set of four plus one, but ₹1,698 as a
 * set of three plus a set of two. So this is a small dynamic programme over
 * the matching pieces, dearest first — which is where sets belong, since a
 * set price does not care what is in it — allowing any piece to stay at full
 * price. A set is only formed if it is cheaper than its pieces, so an offer
 * can never raise a price.
 *
 * Carts are a handful of pieces, so the table is tiny.
 */
export function bestSets(
  units: readonly Unit[],
  tiers: readonly PriceTier[],
  maxSets: number,
): Application[] {
  const n = units.length;
  const limit = Math.min(maxSets, n);
  if (n === 0 || tiers.length === 0 || limit === 0) return [];

  const prefix = [0];
  for (const unit of units) prefix.push(prefix[prefix.length - 1] + unit.listCents);

  // cost[i][k]: least the first i pieces can cost using exactly k sets.
  const INF = Number.POSITIVE_INFINITY;
  const cost: number[][] = Array.from({ length: n + 1 }, () => Array(limit + 1).fill(INF));
  const step: Array<Array<{ size: number; price: number } | null>> = Array.from(
    { length: n + 1 },
    () => Array(limit + 1).fill(null),
  );
  cost[0][0] = 0;

  for (let i = 1; i <= n; i += 1) {
    for (let k = 0; k <= limit; k += 1) {
      // The i-th piece at full price.
      if (cost[i - 1][k] + units[i - 1].listCents < cost[i][k]) {
        cost[i][k] = cost[i - 1][k] + units[i - 1].listCents;
        step[i][k] = null;
      }
      if (k === 0) continue;
      // Or the last `size` pieces as one set.
      for (const tier of tiers) {
        if (tier.size < 1 || tier.size > i) continue;
        const listOfSet = prefix[i] - prefix[i - tier.size];
        if (tier.priceCents >= listOfSet) continue;
        const candidate = cost[i - tier.size][k - 1] + tier.priceCents;
        if (candidate < cost[i][k]) {
          cost[i][k] = candidate;
          step[i][k] = { size: tier.size, price: tier.priceCents };
        }
      }
    }
  }

  let bestK = 0;
  for (let k = 1; k <= limit; k += 1) if (cost[n][k] < cost[n][bestK]) bestK = k;

  const applications: Application[] = [];
  let i = n;
  let k = bestK;
  while (i > 0) {
    const taken = step[i][k];
    if (!taken) {
      i -= 1;
      continue;
    }
    const setUnits = units.slice(i - taken.size, i);
    applications.push({ key: "", units: setUnits, discountCents: sumList(setUnits) - taken.price });
    i -= taken.size;
    k -= 1;
  }

  return applications.reverse().map((application, index) => ({
    ...application,
    key: `set-${index + 1}`,
  }));
}

export function applySetPrice(input: BenefitInput, setSize: number, priceCents: number) {
  return bestSets(input.matching, [{ size: setSize, priceCents }], input.maxApplications);
}

export function applySetPriceTiers(
  input: BenefitInput,
  tiers: readonly PriceTier[],
  leftovers: "NEW_SET" | "FULL_PRICE",
) {
  const maxSets = leftovers === "FULL_PRICE" ? 1 : input.maxApplications;
  return bestSets(input.matching, tiers, maxSets);
}

/**
 * Bundles are filled one at a time, each component taking the dearest free
 * piece that fits it, so the client saves the most. The component with the
 * fewest candidates is filled first, so a piece that could serve two
 * components goes where it is irreplaceable.
 */
export function applyBundle(
  input: BenefitInput,
  components: readonly BundleComponent[],
  priceCents: number,
): Application[] {
  const free = [...input.available];
  const applications: Application[] = [];

  while (applications.length < input.maxApplications) {
    const order = components
      .map((component) => ({
        component,
        candidates: free.filter((unit) => matchesFilter(unit.line, component.pieces)).length,
      }))
      .sort((a, b) => a.candidates - b.candidates);

    const picked: Unit[] = [];
    let complete = true;
    for (const { component } of order) {
      const fits = free.filter(
        (unit) => !picked.includes(unit) && matchesFilter(unit.line, component.pieces),
      );
      if (fits.length < component.quantity) {
        complete = false;
        break;
      }
      picked.push(...fits.slice(0, component.quantity));
    }

    const saving = sumList(picked) - priceCents;
    if (!complete || picked.length === 0 || saving <= 0) break;

    applications.push({ key: `bundle-${applications.length + 1}`, units: picked, discountCents: saving });
    for (const unit of picked) free.splice(free.indexOf(unit), 1);
  }

  return applications;
}
