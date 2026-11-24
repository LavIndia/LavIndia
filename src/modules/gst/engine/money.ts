/**
 * Decimal-safe money arithmetic for the GST engine.
 *
 * Every amount is a whole number of paise and every rate is a whole number of
 * basis points, so nothing here ever touches a floating-point value. The one
 * operation that can leave the safe-integer range — a product of two large
 * integers — is done in BigInt, and rounding is explicit: half-up, away from
 * zero for the (never negative) amounts a sale can carry.
 */

/** Rounds `a * b / c` to the nearest whole number, halves going up. */
export function mulDivRound(a: number, b: number, c: number): number {
  if (!Number.isInteger(a) || !Number.isInteger(b) || !Number.isInteger(c) || c <= 0) {
    throw new RangeError("mulDivRound needs whole numbers and a positive divisor");
  }
  const bigA = BigInt(a);
  const bigB = BigInt(b);
  const bigC = BigInt(c);
  const product = bigA * bigB;
  const negative = product < BigInt(0);
  const magnitude = negative ? -product : product;
  const rounded = (magnitude * BigInt(2) + bigC) / (bigC * BigInt(2));
  const result = negative ? -rounded : rounded;
  if (result > BigInt(Number.MAX_SAFE_INTEGER) || result < BigInt(Number.MIN_SAFE_INTEGER)) {
    throw new RangeError("Amount out of range");
  }
  return Number(result);
}

/** Tax in basis points on an amount: 1800 bps on 10000 paise is 1800 paise. */
export function bpsOf(amountCents: number, bps: number): number {
  return mulDivRound(amountCents, bps, 10_000);
}

/** Splits an amount in two, the first getting the whole half and the second the remainder. */
export function splitInHalf(amountCents: number): [number, number] {
  const first = Math.floor(amountCents / 2);
  return [first, amountCents - first];
}

/**
 * Splits an amount across weights so the parts add back to the amount exactly
 * (largest remainder, ties to the earlier entry). A zero total weight puts
 * everything on the first entry.
 */
export function allocateByWeight(amountCents: number, weights: readonly number[]): number[] {
  if (weights.length === 0) return [];
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  if (total <= 0) return weights.map((_, index) => (index === 0 ? amountCents : 0));

  const shares = weights.map((weight, index) => {
    const exact = BigInt(amountCents) * BigInt(weight);
    const floor = exact / BigInt(total);
    const remainder = exact % BigInt(total);
    return { index, floor: Number(floor), remainder };
  });
  let left = amountCents - shares.reduce((sum, share) => sum + share.floor, 0);
  const order = [...shares].sort((a, b) =>
    a.remainder === b.remainder ? a.index - b.index : a.remainder > b.remainder ? -1 : 1,
  );
  const parts = shares.map((share) => share.floor);
  for (const share of order) {
    if (left <= 0) break;
    parts[share.index] += 1;
    left -= 1;
  }
  return parts;
}

export const sum = (values: readonly number[]): number => values.reduce((total, value) => total + value, 0);
