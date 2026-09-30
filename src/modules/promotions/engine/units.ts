/**
 * The engine works on UNITS, not lines.
 *
 * Offers are about pieces: "any 3" means three pieces whether they are three
 * lines or one line of three. So each line is expanded into its units first,
 * and every offer consumes whole units. A unit is used by one piece offer at
 * most — a piece inside a set price cannot also take 10% off.
 */
import type { EngineLine, PieceFilter, Selector } from "../contracts";

export interface Unit {
  /** `${lineId}#${index}` — stable, unique within the cart. */
  key: string;
  lineId: string;
  index: number;
  /** Position of the line in the cart, for deterministic tie-breaks. */
  lineOrder: number;
  listCents: number;
  line: EngineLine;
}

export function expandUnits(lines: readonly EngineLine[]): Unit[] {
  const units: Unit[] = [];
  lines.forEach((line, lineOrder) => {
    for (let index = 0; index < line.quantity; index += 1) {
      units.push({
        key: `${line.lineId}#${index}`,
        lineId: line.lineId,
        index,
        lineOrder,
        listCents: line.unitPriceCents,
        line,
      });
    }
  });
  return units;
}

/** Dearest first; ties keep cart order so results never depend on luck. */
export function byPriceDesc(a: Unit, b: Unit): number {
  return b.listCents - a.listCents || a.lineOrder - b.lineOrder || a.index - b.index;
}

export function byPriceAsc(a: Unit, b: Unit): number {
  return a.listCents - b.listCents || a.lineOrder - b.lineOrder || a.index - b.index;
}

function lower(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function matchesValue(value: string | null, values: readonly string[]): boolean {
  const wanted = lower(value);
  return wanted !== "" && values.some((candidate) => lower(candidate) === wanted);
}

export function matchesSelector(line: EngineLine, selector: Selector): boolean {
  switch (selector.type) {
    case "all":
      return true;
    case "categories":
      return line.categoryId !== null && selector.ids.includes(line.categoryId);
    case "collections":
      return line.collectionIds.some((id) => selector.ids.includes(id));
    case "products":
      return selector.ids.includes(line.productId);
    case "variants":
      return selector.ids.includes(line.variantId);
    case "materials":
      return matchesValue(line.material, selector.values);
    case "colors":
      return matchesValue(line.color, selector.values);
    case "sizes":
      return matchesValue(line.size, selector.values);
    case "priceRange": {
      const { minCents, maxCents } = selector;
      if (typeof minCents === "number" && line.unitPriceCents < minCents) return false;
      if (typeof maxCents === "number" && line.unitPriceCents > maxCents) return false;
      return true;
    }
  }
}

/**
 * Entries in `include` mean "any of these"; `exclude` means "and not".
 * An empty include list means every piece.
 */
export function matchesFilter(line: EngineLine, filter: PieceFilter): boolean {
  const included =
    filter.include.length === 0 || filter.include.some((s) => matchesSelector(line, s));
  if (!included) return false;
  return !filter.exclude.some((s) => matchesSelector(line, s));
}

export function sumList(units: readonly Unit[]): number {
  return units.reduce((sum, unit) => sum + unit.listCents, 0);
}
