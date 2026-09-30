/**
 * Described pieces in the shape the offer editor's "Which pieces" shows:
 * Piece Sets (saved, or a category or collection as a set), pieces by name,
 * pieces left out, and the marked-down switch.
 *
 * A group the editor can't show that way — "black necklaces under ₹600" —
 * becomes a proposed Piece Set. Its id ("proposed:1") matches no piece until
 * the admin creates it from the editor, so an offer can never go live
 * covering pieces nobody has looked at.
 */
import type { PieceFilter, PieceRule, Selector } from "../contracts";
import { rupees } from "../summarise";

export interface ProposedSet {
  id: string;
  name: string;
  match: "ALL";
  rules: PieceRule[];
}

export const PROPOSED_SET_PREFIX = "proposed:";

/** Proposed sets across one described offer; the same rules share one set. */
export class SetProposals {
  readonly list: ProposedSet[] = [];

  propose(rules: PieceRule[], name: string): string {
    const key = JSON.stringify(rules);
    const same = this.list.find((p) => JSON.stringify(p.rules) === key);
    if (same) return same.id;
    const id = `${PROPOSED_SET_PREFIX}${this.list.length + 1}`;
    this.list.push({ id, name: name.slice(0, 80), match: "ALL", rules });
    return id;
  }
}

/** Selectors that narrow a group rather than name a kind of piece. */
const NARROWING = new Set<Selector["type"]>(["materials", "colors", "sizes", "priceRange", "markedDown"]);

function ruleFor(s: Selector, op: "is" | "isNot" = "is"): PieceRule | null {
  switch (s.type) {
    case "categories":
      return { field: "category", op, values: s.ids };
    case "collections":
      return { field: "collection", op, values: s.ids };
    case "products":
      return { field: "product", op, values: s.ids };
    case "materials":
      return { field: "material", op, values: s.values };
    case "colors":
      return { field: "colour", op, values: s.values };
    case "sizes":
      return { field: "size", op, values: s.values };
    case "markedDown":
      return { field: "markedDown", op };
    case "priceRange": {
      if (op === "isNot") return null;
      const { minCents = null, maxCents = null } = s;
      if (minCents != null && maxCents != null) return { field: "price", op: "between", minCents, maxCents };
      if (maxCents != null) return { field: "price", op: "under", maxCents };
      if (minCents != null) return { field: "price", op: "over", minCents };
      return null;
    }
    default:
      return null;
  }
}

/** A set's name in the shop's words, e.g. "Necklaces · Black · up to ₹600". */
function nameFor(rules: readonly PieceRule[], nameOf: (id: string) => string): string {
  const parts = rules.map((r) => {
    const not = r.op === "isNot" ? "not " : "";
    switch (r.field) {
      case "category":
      case "collection":
      case "product":
        return not + (r.values ?? []).map(nameOf).join(" or ");
      case "price":
        if (r.op === "between") return `${rupees(r.minCents ?? 0)}–${rupees(r.maxCents ?? 0)}`;
        if (r.op === "under") return `up to ${rupees(r.maxCents ?? 0)}`;
        return `${rupees(r.minCents ?? 0)} and above`;
      case "markedDown":
        return r.op === "isNot" ? "not marked down" : "marked down";
      default:
        return not + (r.values ?? []).join(" or ");
    }
  });
  return parts.filter(Boolean).join(" · ") || "Described pieces";
}

export function toChooserFilter(
  groups: readonly Selector[][],
  savedSetIds: readonly string[],
  exclude: readonly Selector[],
  nameOf: (id: string) => string,
  proposals: SetProposals,
  notes: string[],
  label: string,
): PieceFilter {
  const leftOut = exclude.flatMap((s) => (s.type === "products" ? s.ids : []));
  const skipMarkedDown = exclude.some((s) => s.type === "markedDown");
  // Other exceptions ("not silver") become a row in every proposed set.
  const exceptRules: PieceRule[] = [];
  for (const s of exclude) {
    if (s.type === "products" || s.type === "markedDown") continue;
    const rule = ruleFor(s, "isNot");
    if (rule) exceptRules.push(rule);
    else notes.push(`A price exception on the ${label} couldn't be set up — adjust the pieces in the editor.`);
  }
  if (exceptRules.length && savedSetIds.length) {
    notes.push(`The exceptions don't apply to the saved Piece Sets on the ${label} — edit those sets if they should.`);
  }

  const setIds = [...savedSetIds];
  const named: string[] = [];
  const addSet = (rules: PieceRule[]) => setIds.push(proposals.propose(rules, nameFor(rules, nameOf)));

  for (const group of groups) {
    const kinds = group.filter((s) => !NARROWING.has(s.type));
    const narrowing = group.filter((s) => NARROWING.has(s.type));
    if (!narrowing.length && !exceptRules.length) {
      // Plain categories, collections and pieces need no new set.
      for (const s of kinds) {
        if (s.type === "categories") setIds.push(...s.ids.map((id) => `category:${id}`));
        else if (s.type === "collections") setIds.push(...s.ids.map((id) => `collection:${id}`));
        else if (s.type === "products") named.push(...s.ids);
      }
      continue;
    }
    const narrowRules = narrowing.map((s) => ruleFor(s)).filter((r): r is PieceRule => r !== null);
    // One set per kind, so "earrings or the Festive Edit, in black" stays an "or".
    const bases = kinds.length ? kinds : [null];
    for (const base of bases) {
      const baseRule = base ? ruleFor(base) : null;
      addSet([...(baseRule ? [baseRule] : []), ...narrowRules, ...exceptRules]);
    }
  }
  // "Every piece except silver": one set of everything but the exceptions.
  if (!groups.length && !savedSetIds.length && exceptRules.length) addSet(exceptRules);

  return {
    include: named.length ? [{ type: "products", ids: [...new Set(named)] }] : [],
    exclude: [
      ...(leftOut.length ? [{ type: "products" as const, ids: [...new Set(leftOut)] }] : []),
      ...(skipMarkedDown ? [{ type: "markedDown" as const }] : []),
    ],
    ...(setIds.length ? { setIds: [...new Set(setIds)] } : {}),
  };
}
