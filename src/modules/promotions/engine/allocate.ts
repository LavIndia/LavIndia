/**
 * Splitting a discount across units, to the paisa.
 *
 * Every rupee of discount has to land on a specific line: a GST invoice
 * states the taxable value per line, a return refunds what that line was
 * actually sold for, and margin per product is only true if the discount is
 * where it was earned. So a discount is spread in proportion to each unit's
 * value, floored to whole paise, and the paise left over go to the largest
 * remainders — the shares always add up to exactly the total.
 */

export interface Share {
  weight: number;
  /** Tie-break when remainders are equal: higher first. */
  priority: number;
}

export function allocateProportionally(totalCents: number, shares: readonly Share[]): number[] {
  if (shares.length === 0 || totalCents <= 0) return shares.map(() => 0);

  const totalWeight = shares.reduce((sum, share) => sum + share.weight, 0);
  if (totalWeight <= 0) {
    // Nothing to weigh by: split evenly with the same leftover rule.
    return allocateProportionally(
      totalCents,
      shares.map((share) => ({ weight: 1, priority: share.priority })),
    );
  }

  const exact = shares.map((share) => (totalCents * share.weight) / totalWeight);
  const floors = exact.map(Math.floor);
  let leftover = totalCents - floors.reduce((sum, value) => sum + value, 0);

  const order = exact
    .map((value, index) => ({ index, remainder: value - floors[index] }))
    .sort(
      (a, b) =>
        b.remainder - a.remainder ||
        shares[b.index].priority - shares[a.index].priority ||
        a.index - b.index,
    );

  for (const { index } of order) {
    if (leftover <= 0) break;
    floors[index] += 1;
    leftover -= 1;
  }
  return floors;
}

/** Applies a percentage in basis points, rounding half up to the paisa. */
export function percentOf(cents: number, bps: number): number {
  return Math.round((cents * bps) / 10_000);
}

/** Turns a tax-inclusive price into its pre-tax amount. */
export function preTax(cents: number, taxRateBps: number): number {
  return Math.round((cents * 10_000) / (10_000 + taxRateBps));
}
