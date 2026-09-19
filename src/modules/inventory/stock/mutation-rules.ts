/**
 * How each movement type changes an inventory level.
 *
 * Stated once, in one table, rather than scattered across service methods —
 * so the semantics of, say, a sale that settles an existing reservation can
 * be read at a glance and reviewed without tracing control flow.
 */
import type { InventoryMovementType } from "../contracts";
import type { LevelMutation } from "./level-mutations";

/**
 * The movement types, plus one internal variant. A sale that settles a hold
 * is recorded in the ledger as an ordinary SALE — only the level arithmetic
 * differs — so this extra key never appears in stored data.
 */
export type MutationRule = InventoryMovementType | "SALE_FROM_RESERVATION";

type RuleFn = (quantity: number) => Omit<LevelMutation, "variantId" | "locationId">;

const addsStock: RuleFn = (q) => ({
  deltaQuantity: q,
  deltaReserved: 0,
  requireAvailable: 0,
  requireReserved: 0,
});

const takesStock: RuleFn = (q) => ({
  deltaQuantity: -q,
  deltaReserved: 0,
  requireAvailable: q,
  requireReserved: 0,
});

export const MUTATION_RULES: Record<MutationRule, RuleFn> = {
  RECEIVE: addsStock,
  RETURN: addsStock,
  ADJUSTMENT_IN: addsStock,

  ADJUSTMENT_OUT: takesStock,
  DAMAGE: takesStock,
  // A counter sale takes stock straight off the shelf.
  SALE: takesStock,

  // An online sale settles a hold placed earlier: the units leave stock and
  // the hold covering them is dropped at the same instant, so the guard is
  // on the reservation rather than on availability.
  SALE_FROM_RESERVATION: (q) => ({
    deltaQuantity: -q,
    deltaReserved: -q,
    requireAvailable: 0,
    requireReserved: q,
  }),

  // A hold may only be placed against stock nobody else has claimed.
  RESERVE: (q) => ({
    deltaQuantity: 0,
    deltaReserved: q,
    requireAvailable: q,
    requireReserved: 0,
  }),

  RELEASE: (q) => ({
    deltaQuantity: 0,
    deltaReserved: -q,
    requireAvailable: 0,
    requireReserved: q,
  }),
};

/** Rules whose guard is the reservation, so a failure means the hold is gone. */
export function failsOnMissingReservation(rule: MutationRule): boolean {
  return rule === "RELEASE" || rule === "SALE_FROM_RESERVATION";
}
