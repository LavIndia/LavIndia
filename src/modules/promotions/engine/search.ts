/**
 * Which piece offers get which pieces — chosen so the client pays least.
 *
 * Each unit can be used by one piece offer at most, so offers compete for
 * pieces. Trying the offers in every order, each taking the pieces it wants
 * from what is still free, and keeping the cheapest result, finds the
 * best split for the carts a jewellery shop sees: a handful of pieces and a
 * handful of offers that could apply to them. Past that size the offers are
 * tried once, strongest first, which is what the admin would expect anyway.
 */
import type { EngineContext, EnginePromotion } from "../contracts";
import { applyPieceOffer, savingOf } from "./apply-piece";
import type { Application } from "./piece-benefits";
import type { Unit } from "./units";

/** 7! = 5,040 orderings; each is a few array passes over a small cart. */
const EXHAUSTIVE_LIMIT = 7;

export interface PieceAssignment {
  byPromotion: Map<string, Application[]>;
  saving: number;
}

/** Stable preference among equals: explicit rank, then the older offer. */
export function preference(a: EnginePromotion, b: EnginePromotion): number {
  const rankA = a.rank ?? Number.MAX_SAFE_INTEGER;
  const rankB = b.rank ?? Number.MAX_SAFE_INTEGER;
  return rankA - rankB || a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id);
}

function runOrdering(
  ordering: readonly EnginePromotion[],
  units: readonly Unit[],
  context: EngineContext,
): PieceAssignment {
  let free = [...units];
  const byPromotion = new Map<string, Application[]>();
  let saving = 0;

  for (const promotion of ordering) {
    const applications = applyPieceOffer(promotion, free, context);
    if (applications.length === 0) continue;
    byPromotion.set(promotion.id, applications);
    saving += savingOf(applications);
    const used = new Set(applications.flatMap((a) => a.units.map((u) => u.key)));
    free = free.filter((unit) => !used.has(unit.key));
  }
  return { byPromotion, saving };
}

function* permutations<T>(items: readonly T[]): Generator<T[]> {
  if (items.length <= 1) {
    yield [...items];
    return;
  }
  for (let i = 0; i < items.length; i += 1) {
    const rest = [...items.slice(0, i), ...items.slice(i + 1)];
    for (const tail of permutations(rest)) yield [items[i], ...tail];
  }
}

/** Every piece offer's saving on its own, against the whole cart. */
export function standaloneSavings(
  promotions: readonly EnginePromotion[],
  units: readonly Unit[],
  context: EngineContext,
): Map<string, number> {
  return new Map(
    promotions.map((p) => [p.id, savingOf(applyPieceOffer(p, units, context))] as const),
  );
}

export function bestPieceAssignment(
  promotions: readonly EnginePromotion[],
  units: readonly Unit[],
  context: EngineContext,
  standalone: Map<string, number>,
): PieceAssignment {
  // An offer that saves nothing on the whole cart cannot save anything on
  // part of it, so it is dropped before the orderings are tried.
  const useful = promotions
    .filter((p) => (standalone.get(p.id) ?? 0) > 0)
    .sort((a, b) => (standalone.get(b.id) ?? 0) - (standalone.get(a.id) ?? 0) || preference(a, b));

  if (useful.length === 0) return { byPromotion: new Map(), saving: 0 };
  if (useful.length > EXHAUSTIVE_LIMIT) return runOrdering(useful, units, context);

  let best: PieceAssignment | null = null;
  for (const ordering of permutations(useful)) {
    const result = runOrdering(ordering, units, context);
    // Strictly better only, so among equals the first ordering — strongest
    // and highest-ranked offer first — is kept.
    if (!best || result.saving > best.saving) best = result;
  }
  return best!;
}
