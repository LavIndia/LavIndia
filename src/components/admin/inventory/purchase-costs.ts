/**
 * The money on a purchase line, and how the three figures relate.
 *
 * A delivery is bargained for, so there are three prices worth keeping and
 * they are not the same thing:
 *
 *   Asking price   what the vendor first wanted, per unit
 *   After bargain  what was agreed once it was argued down
 *   Your cost      what it actually costs you, once any extra is added on
 *
 * Only the last of those is what margin is worked out from. The other two
 * exist so the shop can see what bargaining is worth, which it otherwise
 * never can: spend is recorded everywhere, savings nowhere.
 *
 * Pure functions, held apart from the form, because this is the part with
 * arithmetic in it and it is far easier to reason about on its own.
 */

/** Whether a typed amount is for one unit or for the whole line. */
export type CostBasis = "UNIT" | "TOTAL";

export const COST_BASES: { value: CostBasis; label: string }[] = [
  { value: "UNIT", label: "Per unit" },
  { value: "TOTAL", label: "Total" },
];

/** The three prices as typed, in rupees, exactly as they came off the form. */
export interface TypedCosts {
  listCost?: string;
  agreedCost?: string;
  unitCost?: string;
  costBasis?: CostBasis;
}

/** The same three, resolved to paisa per unit. Undefined means not recorded. */
export interface ResolvedCosts {
  listUnitCostCents?: number;
  agreedUnitCostCents?: number;
  /** What the line is actually costed at, which is what accounting uses. */
  unitCostCents?: number;
}

/**
 * One typed amount as paisa per unit.
 *
 * A total is divided by the quantity, because everything downstream — the
 * ledger, the margin, the stock valuation — reasons per unit. Doing the
 * division here means nothing further down has to know the operator was
 * reading a bill that only gave a line total.
 */
export function perUnitCents(
  raw: string | undefined,
  basis: CostBasis,
  quantity: number,
): number | undefined {
  const value = parseFloat((raw ?? "").trim());
  if (!Number.isFinite(value) || value < 0) return undefined;

  const cents = Math.round(value * 100);
  return basis === "TOTAL" ? Math.round(cents / Math.max(1, quantity)) : cents;
}

/**
 * Resolves what was typed into what is stored.
 *
 * The figures cascade, so the common case is one number rather than three:
 * a delivery nobody argued over is just a cost, and one that was bargained
 * down but carries no extra charges needs no separate "your cost". Only the
 * unusual case — a bargained price plus freight or making charges — asks for
 * all three.
 */
export function resolveCosts(typed: TypedCosts, quantity: number): ResolvedCosts {
  const basis = typed.costBasis ?? "UNIT";
  const list = perUnitCents(typed.listCost, basis, quantity);
  const agreed = perUnitCents(typed.agreedCost, basis, quantity);
  const mine = perUnitCents(typed.unitCost, basis, quantity);

  return {
    ...(list === undefined ? {} : { listUnitCostCents: list }),
    ...(agreed === undefined ? {} : { agreedUnitCostCents: agreed }),
    ...(mine ?? agreed ?? list) === undefined
      ? {}
      : { unitCostCents: mine ?? agreed ?? list },
  };
}

/**
 * What the bargaining was worth on this line, in paisa.
 *
 * Null rather than zero when there is nothing to compare against — a line
 * with no asking price recorded did not save nothing, it simply cannot say.
 */
export function savedCents(resolved: ResolvedCosts, quantity: number): number | null {
  const { listUnitCostCents: list, unitCostCents: paid } = resolved;
  if (list === undefined || paid === undefined) return null;
  return (list - paid) * quantity;
}
