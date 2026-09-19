import type {
  RfmBoard,
  RfmCustomer,
  RfmFacts,
  RfmScore,
  RfmSegment,
  RfmSegmentSummary,
} from "./rfm-types";

/**
 * Turning what customers did into how to treat them.
 *
 * Pure functions over plain facts: no database, no framework, no LavIndia.
 * The same scoring answers for any shop that can say when someone last
 * bought, how often, and for how much.
 *
 * Scores are quintiles against this shop's own customers rather than against
 * fixed thresholds, because "a lot of money" means something different in a
 * jewellery house than in a grocery. A rupee figure hardcoded here would be
 * wrong for every business including, eventually, this one.
 */

/** Days between two instants, floored — part of a day is not a day. */
function daysBetween(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
}

/**
 * Quintile rank of every value, 1 (lowest) to 5 (highest).
 *
 * Ranked by position rather than by cutting the numeric range into five, so
 * one enormous order cannot push every other customer into the bottom
 * bucket — which is exactly what happens in a business where a single piece
 * can be worth more than a hundred others.
 *
 * Ties share a score: two customers with identical spend must not land in
 * different segments because of their order in the array.
 */
export function quintileScores(values: number[]): RfmScore[] {
  if (values.length === 0) return [];

  const sorted = [...values].sort((a, b) => a - b);

  // The cut points are the 20th, 40th, 60th and 80th percentiles of the
  // distinct values, so a distribution with few distinct figures (a young
  // shop, say) still spreads across the scale instead of collapsing to one.
  const distinct = [...new Set(sorted)];
  const cuts = [0.2, 0.4, 0.6, 0.8].map(
    (p) => distinct[Math.min(distinct.length - 1, Math.floor(p * distinct.length))],
  );

  return values.map((value) => {
    let score: RfmScore = 1;
    for (const cut of cuts) {
      if (value >= cut) score = Math.min(5, score + 1) as RfmScore;
    }
    return score;
  });
}

/**
 * Which segment a set of scores belongs to.
 *
 * Recency and frequency decide the segment; monetary only separates the two
 * cases where the money is the whole point — a lapsed big spender is a
 * different problem from a lapsed small one, and worth a phone call rather
 * than an email.
 *
 * The order of these tests matters: the first match wins, so the most
 * specific and most urgent cases are checked first.
 */
export function segmentFor(
  recency: RfmScore,
  frequency: RfmScore,
  monetary: RfmScore,
): RfmSegment {
  if (recency >= 4 && frequency >= 4 && monetary >= 4) return "CHAMPIONS";
  // Gone quiet, but they used to buy often and spend well. The most
  // expensive customers to lose, and the least obvious on a revenue chart.
  if (recency <= 2 && frequency >= 4 && monetary >= 4) return "CANNOT_LOSE";
  if (recency <= 2 && frequency >= 3) return "AT_RISK";
  if (frequency >= 4) return "LOYAL";
  if (recency === 5 && frequency <= 1) return "NEW";
  if (recency === 4 && frequency <= 1) return "PROMISING";
  if (recency >= 4) return "POTENTIAL_LOYALIST";
  if (recency === 3 && frequency >= 3) return "NEEDS_ATTENTION";
  if (recency === 3) return "ABOUT_TO_SLEEP";
  if (recency === 1 && frequency === 1) return "LOST";
  return "HIBERNATING";
}

/** Everything a screen needs, from the raw per-customer figures. */
export function buildRfmBoard(facts: RfmFacts[], asOf: Date = new Date()): RfmBoard {
  // Customers who have never bought cannot be scored against those who have;
  // including them would drag every quintile boundary downwards.
  const buyers = facts.filter((f) => f.lastOrderAt !== null && f.orderCount > 0);

  const recencyDays = buyers.map((f) => daysBetween(f.lastOrderAt!, asOf));
  // Recency is inverted before scoring: fewer days since the last order is
  // better, and 5 must always mean best.
  const recencyScores = quintileScores(recencyDays.map((d) => -d));
  const frequencyScores = quintileScores(buyers.map((f) => f.orderCount));
  const monetaryScores = quintileScores(buyers.map((f) => f.totalSpendCents));

  const customers: RfmCustomer[] = buyers.map((f, i) => {
    const recency = recencyScores[i];
    const frequency = frequencyScores[i];
    const monetary = monetaryScores[i];
    return {
      ...f,
      recencyDays: recencyDays[i],
      recency,
      frequency,
      monetary,
      segment: segmentFor(recency, frequency, monetary),
    };
  });

  const totalRevenueCents = customers.reduce((sum, c) => sum + c.totalSpendCents, 0);

  const bySegment = new Map<RfmSegment, RfmCustomer[]>();
  for (const customer of customers) {
    const list = bySegment.get(customer.segment) ?? [];
    list.push(customer);
    bySegment.set(customer.segment, list);
  }

  const segments: RfmSegmentSummary[] = [...bySegment.entries()]
    .map(([segment, list]) => {
      const revenueCents = list.reduce((sum, c) => sum + c.totalSpendCents, 0);
      const orders = list.reduce((sum, c) => sum + c.orderCount, 0);
      return {
        segment,
        customers: list.length,
        revenueCents,
        revenueShare: totalRevenueCents > 0 ? revenueCents / totalRevenueCents : 0,
        averageOrderValueCents: orders > 0 ? Math.round(revenueCents / orders) : 0,
      };
    })
    .sort((a, b) => b.revenueCents - a.revenueCents);

  const gridCounts = new Map<string, number>();
  for (const c of customers) {
    const key = `${c.recency}:${c.frequency}`;
    gridCounts.set(key, (gridCounts.get(key) ?? 0) + 1);
  }
  const grid: RfmBoard["grid"] = [];
  for (let r = 5; r >= 1; r--) {
    for (let f = 1; f <= 5; f++) {
      grid.push({
        recency: r as RfmScore,
        frequency: f as RfmScore,
        customers: gridCounts.get(`${r}:${f}`) ?? 0,
      });
    }
  }

  return {
    customers: customers.sort((a, b) => b.totalSpendCents - a.totalSpendCents),
    segments,
    grid,
    totalCustomers: customers.length,
    totalRevenueCents,
    asOf,
  };
}
