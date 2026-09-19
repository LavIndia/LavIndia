/**
 * Why a stock count changed.
 *
 * A curated list rather than a free-text box, for two reasons. It turns a
 * sentence someone has to compose into a single tap, which is the difference
 * between correcting a number in two seconds and filling in a form. And it
 * keeps the ledger groupable — "how much did we write off to damage this
 * year" is only answerable if damage is a value rather than prose.
 *
 * A note can still be added when there is genuinely something to say; it is
 * appended to the reason rather than replacing it.
 */

export type CountReasonCode =
  | "STOCKTAKE"
  | "DAMAGED"
  | "LOST"
  | "FOUND"
  | "RETURNED_TO_SUPPLIER"
  | "GIFTED";

export interface CountReason {
  code: CountReasonCode;
  label: string;
  /** Shown when the count went up, down, or either. Narrows what is offered. */
  direction: "UP" | "DOWN" | "BOTH";
}

export const COUNT_REASONS: CountReason[] = [
  { code: "STOCKTAKE", label: "Stocktake correction", direction: "BOTH" },
  { code: "FOUND", label: "Found", direction: "UP" },
  { code: "DAMAGED", label: "Damaged", direction: "DOWN" },
  { code: "LOST", label: "Lost or stolen", direction: "DOWN" },
  { code: "RETURNED_TO_SUPPLIER", label: "Returned to supplier", direction: "DOWN" },
  { code: "GIFTED", label: "Gifted or sampled", direction: "DOWN" },
];

/** The reasons worth offering for a change in this direction. */
export function reasonsForDirection(delta: number): CountReason[] {
  const wanted = delta > 0 ? "UP" : "DOWN";
  return COUNT_REASONS.filter((r) => r.direction === "BOTH" || r.direction === wanted);
}

/**
 * Damage keeps its own movement type so write-offs can be totalled apart from
 * ordinary miscounts. Everything else is a plain adjustment in the direction
 * the count moved.
 */
export function reasonToMovementType(
  code: CountReasonCode,
  delta: number,
): "ADJUSTMENT_IN" | "ADJUSTMENT_OUT" | "DAMAGE" {
  if (code === "DAMAGED") return "DAMAGE";
  return delta > 0 ? "ADJUSTMENT_IN" : "ADJUSTMENT_OUT";
}
