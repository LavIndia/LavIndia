/**
 * Money helpers. Every amount in LavIndia is an integer number of paisa —
 * never a float — so totals are exact and an invoice can be re-derived from
 * its parts years later.
 */

export const PAISA_PER_RUPEE = 100;

/** Formats paisa as Indian rupees, e.g. 1234500 -> "₹12,345.00". */
export function formatPaisa(paisa: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(paisa / PAISA_PER_RUPEE);
}

/** Formats paisa without decimals for dense UI, e.g. 1234500 -> "₹12,345". */
export function formatPaisaCompact(paisa: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paisa / PAISA_PER_RUPEE);
}

export function rupeesToPaisa(rupees: number): number {
  return Math.round(rupees * PAISA_PER_RUPEE);
}

export function paisaToRupees(paisa: number): number {
  return paisa / PAISA_PER_RUPEE;
}

/**
 * Applies a tax rate given in basis points (300 = 3%), rounding to the
 * nearest paisa. Basis points keep GST rates exact as integers.
 */
export function taxFromBps(baseCents: number, rateBps: number): number {
  return Math.round((baseCents * rateBps) / 10_000);
}
