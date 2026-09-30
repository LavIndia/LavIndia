/**
 * Turns pieces described by name into a PieceFilter of ids and catalog
 * values.
 *
 * Every name is checked against the catalog. A name that isn't there is
 * dropped with a note — and when that would leave a group wider than asked
 * ("black necklaces" becoming "all necklaces" because there is no black), the
 * whole group is dropped instead. A description can only ever narrow.
 */
import type { PieceFilter, Selector } from "../contracts";
import type { DescribedPieces, DescribedSelector } from "./output-schema";
import { toChooserFilter, type SetProposals } from "./to-chooser";

export interface DescribeVocabulary {
  categories: Array<{ id: string; name: string }>;
  collections: Array<{ id: string; name: string }>;
  products: Array<{ id: string; name: string; priceCents: number }>;
  savedSets: Array<{ id: string; name: string }>;
  materials: string[];
  colors: string[];
  sizes: string[];
}

export const paise = (rupees: number) => Math.max(0, Math.round(rupees * 100));

const fold = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
const singular = (s: string) => fold(s).replace(/(es|s)$/, "");

/** The catalog entry a name refers to: exact, then singular/plural, then a unique partial match. */
function findOne<T>(name: string, list: readonly T[], nameOf: (item: T) => string): T | undefined {
  const wanted = fold(name);
  if (!wanted) return undefined;
  const exact = list.find((item) => fold(nameOf(item)) === wanted);
  if (exact) return exact;
  const plural = list.find((item) => singular(nameOf(item)) === singular(name));
  if (plural) return plural;
  const partial = list.filter((item) => fold(nameOf(item)).includes(wanted));
  return partial.length === 1 ? partial[0] : undefined;
}

const KIND_WORD: Record<DescribedSelector["kind"], string> = {
  category: "category",
  collection: "collection",
  product: "piece",
  material: "material",
  colour: "colour",
  size: "size",
  price: "price",
  markedDown: "marked-down",
};

/** Names → matches; the ones not found are reported and left out. */
function resolveAll<T>(
  names: readonly string[],
  list: readonly T[],
  nameOf: (item: T) => string,
  word: string,
  notes: string[],
): T[] {
  const found: T[] = [];
  for (const name of names) {
    const hit = findOne(name, list, nameOf);
    if (hit) {
      if (!found.includes(hit)) found.push(hit);
    } else {
      notes.push(`“${name}” isn't a ${word} in the catalog, so it was left out.`);
    }
  }
  return found;
}

/** One described selector as an engine selector; null when none of its names are in the catalog. */
function toSelector(s: DescribedSelector, vocab: DescribeVocabulary, notes: string[]): Selector | null {
  const word = KIND_WORD[s.kind];
  const byName = <T>(list: readonly T[], nameOf: (item: T) => string) => resolveAll(s.names, list, nameOf, word, notes);
  switch (s.kind) {
    case "category": {
      const found = byName(vocab.categories, (c) => c.name);
      return found.length ? { type: "categories", ids: found.map((c) => c.id) } : null;
    }
    case "collection": {
      const found = byName(vocab.collections, (c) => c.name);
      return found.length ? { type: "collections", ids: found.map((c) => c.id) } : null;
    }
    case "product": {
      const found = byName(vocab.products, (p) => p.name);
      return found.length ? { type: "products", ids: found.map((p) => p.id) } : null;
    }
    case "material":
    case "colour":
    case "size": {
      const list = s.kind === "material" ? vocab.materials : s.kind === "colour" ? vocab.colors : vocab.sizes;
      const found = byName(list, (v) => v);
      const type = s.kind === "material" ? "materials" : s.kind === "colour" ? "colors" : "sizes";
      return found.length ? { type, values: found } : null;
    }
    case "price": {
      const minCents = s.minRupees != null && s.minRupees > 0 ? paise(s.minRupees) : null;
      const maxCents = s.maxRupees != null && s.maxRupees > 0 ? paise(s.maxRupees) : null;
      return minCents === null && maxCents === null ? null : { type: "priceRange", minCents, maxCents };
    }
    case "markedDown":
      return { type: "markedDown" };
  }
}

/** Same-kind selectors in one group are one list: "gold or silver", not "gold and silver". */
function mergeSameKind(selectors: Selector[]): Selector[] {
  const merged: Selector[] = [];
  for (const s of selectors) {
    const same = merged.find((m) => m.type === s.type);
    if (same && "ids" in same && "ids" in s) same.ids = [...new Set([...same.ids, ...s.ids])];
    else if (same && "values" in same && "values" in s) same.values = [...new Set([...same.values, ...s.values])];
    else if (!same) merged.push({ ...s } as Selector);
  }
  return merged;
}

/** A group, or null when a missing name would make it cover more than described. */
function toGroup(group: readonly DescribedSelector[], vocab: DescribeVocabulary, notes: string[]): Selector[] | null {
  const out: Selector[] = [];
  for (const described of group) {
    const selector = toSelector(described, vocab, notes);
    if (selector) {
      out.push(selector);
    } else if (described.kind !== "price" || described.minRupees != null || described.maxRupees != null) {
      // Dropping this part would widen the group, so drop the group.
      return null;
    }
  }
  return out.length ? mergeSameKind(out) : null;
}

function nameLookup(vocab: DescribeVocabulary): (id: string) => string {
  const names = new Map<string, string>();
  for (const item of [...vocab.categories, ...vocab.collections, ...vocab.products]) names.set(item.id, item.name);
  return (id) => names.get(id) ?? "a piece";
}

/**
 * The described pieces as the editor shows them. `unmatched` is true when
 * pieces were described but none could be found, so the filter would cover
 * every piece — the caller must make the admin choose.
 */
export function toPieceFilter(
  spec: DescribedPieces,
  vocab: DescribeVocabulary,
  notes: string[],
  label: string,
  proposals: SetProposals,
): { filter: PieceFilter; unmatched: boolean } {
  const savedSetIds = resolveAll(spec.savedSets, vocab.savedSets, (s) => s.name, "saved Piece Set", notes).map((s) => s.id);
  const groups: Selector[][] = [];
  for (const group of spec.groups) {
    const converted = toGroup(group, vocab, notes);
    if (converted) groups.push(converted);
    else if (group.length) notes.push(`One group of ${label} couldn't be matched to the catalog and was left out — add it in the editor.`);
  }
  const exclude = mergeSameKind(
    spec.except.map((s) => toSelector(s, vocab, notes)).filter((s): s is Selector => s !== null),
  );

  const described = spec.groups.some((g) => g.length > 0) || spec.savedSets.length > 0;
  const unmatched = described && groups.length === 0 && savedSetIds.length === 0;
  const filter = toChooserFilter(groups, savedSetIds, exclude, nameLookup(vocab), proposals, notes, label);
  return { filter, unmatched };
}
