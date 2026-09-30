/**
 * An offer in plain English — the editor's live summary, the list screen's
 * second line, and the default client-facing title.
 *
 * Pure: names are handed in, so the same text renders on the server and in
 * the browser.
 */
import type { Benefit, Condition, PieceFilter, RewardValue, Selector } from "./contracts";

export interface NameLookup {
  categories: Record<string, string>;
  collections: Record<string, string>;
  products: Record<string, string>;
  variants: Record<string, string>;
  /** Piece Set names by id, built-in sets included. */
  sets?: Record<string, string>;
}

const EMPTY: NameLookup = { categories: {}, collections: {}, products: {}, variants: {} };

export function rupees(cents: number): string {
  const whole = cents % 100 === 0;
  return `₹${(cents / 100).toLocaleString("en-IN", {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

export const percent = (bps: number) => `${(bps / 100).toLocaleString("en-IN")}%`;

function list(values: string[]): string {
  if (values.length <= 1) return values[0] ?? "";
  if (values.length === 2) return `${values[0]} or ${values[1]}`;
  return `${values.slice(0, -1).join(", ")} or ${values[values.length - 1]}`;
}

function describeSelector(selector: Selector, names: NameLookup): string {
  const named = (ids: string[], table: Record<string, string>) =>
    list(ids.map((id) => table[id] ?? "a removed item"));
  switch (selector.type) {
    case "all":
      return "every piece";
    case "categories":
      return named(selector.ids, names.categories);
    case "collections":
      return `the ${named(selector.ids, names.collections)} collection`;
    case "products":
      return named(selector.ids, names.products);
    case "variants":
      return named(selector.ids, names.variants);
    case "materials":
      return `${list(selector.values)} pieces`;
    case "colors":
      return `${list(selector.values)} pieces`;
    case "sizes":
      return `size ${list(selector.values)}`;
    case "markedDown":
      return "pieces already marked down";
    case "priceRange": {
      const { minCents, maxCents } = selector;
      if (minCents != null && maxCents != null) return `pieces ${rupees(minCents)}–${rupees(maxCents)}`;
      if (minCents != null) return `pieces from ${rupees(minCents)}`;
      if (maxCents != null) return `pieces up to ${rupees(maxCents)}`;
      return "pieces at any price";
    }
  }
}

function describeGroup(include: Selector[], names: NameLookup): string {
  const groupTypes = new Set(["all", "categories", "collections", "products", "variants"]);
  const groups = include.filter((s) => groupTypes.has(s.type));
  const narrowing = include.filter((s) => !groupTypes.has(s.type));
  const base = groups.length ? list(groups.map((s) => describeSelector(s, names))) : "pieces";
  return narrowing.length
    ? `${base} (${narrowing.map((s) => describeSelector(s, names)).join(", ")})`
    : base;
}

export function describePieces(filter: PieceFilter | null, names: NameLookup = EMPTY): string {
  if (filter?.setIds?.length) {
    const named = filter.include.flatMap((s) => (s.type === "products" ? s.ids : []));
    return list([
      ...filter.setIds.map((id) => names.sets?.[id] ?? "a removed set"),
      ...named.map((id) => names.products[id] ?? "a removed piece"),
    ]);
  }
  const extra = (filter?.or ?? []).filter((g) => g.length > 0);
  if (filter && extra.length > 0) {
    const all = [filter.include, ...extra].filter((g) => g.length > 0).map((g) => describeGroup(g, names));
    const excluded = filter.exclude.map((s) => describeSelector(s, names));
    const joined = all.join(" or ");
    return excluded.length ? `${joined}, except ${list(excluded)}` : joined;
  }
  if (!filter || filter.include.length === 0) {
    const base = "any piece";
    return filter?.exclude.length
      ? `${base} except ${list(filter.exclude.map((s) => describeSelector(s, names)))}`
      : base;
  }
  const groupTypes = new Set(["all", "categories", "collections", "products", "variants"]);
  const groups = filter.include.filter((s) => groupTypes.has(s.type));
  const narrowing = filter.include.filter((s) => !groupTypes.has(s.type));
  const base = groups.length ? list(groups.map((s) => describeSelector(s, names))) : "pieces";
  const narrowed = narrowing.length
    ? `${base} (${narrowing.map((s) => describeSelector(s, names)).join(", ")})`
    : base;
  const excluded = filter.exclude.map((s) => describeSelector(s, names));
  return excluded.length ? `${narrowed}, except ${list(excluded)}` : narrowed;
}

function describeReward(value: RewardValue): string {
  if (value.type === "percent") return value.bps >= 10_000 ? "free" : `${percent(value.bps)} off`;
  if (value.type === "amountOff") return `${rupees(value.cents)} off`;
  return `for ${rupees(value.cents)}`;
}

/** A short name for the offer, e.g. "Any 3 for ₹999". */
export function headline(benefit: Benefit): string {
  switch (benefit.type) {
    case "percentOff":
      return `${percent(benefit.bps)} off`;
    case "amountOffEach":
      return `${rupees(benefit.cents)} off each piece`;
    case "fixedPriceEach":
      return `Everything at ${rupees(benefit.cents)}`;
    case "percentTiers":
      return "Buy more, save more";
    case "setPrice":
      return `Any ${benefit.setSize} for ${rupees(benefit.priceCents)}`;
    case "setPriceTiers":
      return benefit.tiers.map((t) => `${t.size} for ${rupees(t.priceCents)}`).join(" · ");
    case "reward":
      return benefit.value.type === "percent" && benefit.value.bps >= 10_000
        ? `Buy ${benefit.buyQuantity} Get ${benefit.getQuantity} Free`
        : `Buy ${benefit.buyQuantity}, get ${benefit.getQuantity} ${describeReward(benefit.value)}`;
    case "bundle":
      return `Set of ${benefit.components.length} for ${rupees(benefit.priceCents)}`;
    case "amountOffOrder":
      return `${rupees(benefit.cents)} off your order`;
    case "percentOffOrder":
      return `${percent(benefit.bps)} off your order`;
    case "orderTiers":
      return "Spend more, save more";
    case "freeDelivery":
      return "Free delivery";
  }
}

export function describeBenefit(benefit: Benefit, pieces: PieceFilter, names: NameLookup = EMPTY) {
  const on = describePieces(pieces, names);
  switch (benefit.type) {
    case "percentOff":
      return `${percent(benefit.bps)} off ${on}`;
    case "amountOffEach":
      return `${rupees(benefit.cents)} off each of ${on}`;
    case "fixedPriceEach":
      return `${on} at ${rupees(benefit.cents)} each`;
    case "percentTiers":
      return benefit.tiers
        .map((t) =>
          benefit.basis === "QUANTITY"
            ? `${t.min}+ pieces: ${percent(t.bps)} off`
            : `${rupees(t.min)}+: ${percent(t.bps)} off`,
        )
        .join(" · ") + ` on ${on}`;
    case "setPrice":
      return `Any ${benefit.setSize} of ${on} for ${rupees(benefit.priceCents)}`;
    case "setPriceTiers":
      return `${headline(benefit)} from ${on}`;
    case "reward":
      return `Buy ${benefit.buyQuantity} of ${on}, get ${benefit.getQuantity} of ${
        benefit.gets ? describePieces(benefit.gets, names) : "the same"
      } ${describeReward(benefit.value)} (${benefit.pick === "CHEAPEST" ? "lowest" : "highest"}-priced)`;
    case "bundle":
      return `${benefit.components
        .map((c) => `${c.quantity} × ${describePieces(c.pieces, names)}`)
        .join(" + ")} for ${rupees(benefit.priceCents)}`;
    case "orderTiers":
      return benefit.tiers
        .map(
          (t) =>
            `Spend ${rupees(t.minSubtotalCents)}: ${
              t.amountOffCents != null ? rupees(t.amountOffCents) : percent(t.bps ?? 0)
            } off`,
        )
        .join(" · ");
    default:
      return headline(benefit);
  }
}

export function describeCondition(condition: Condition): string {
  switch (condition.type) {
    case "minOrderSubtotal":
      return `Orders of ${rupees(condition.cents)} or more`;
    case "minOrderQuantity":
      return `Orders of ${condition.quantity}+ pieces`;
    case "signedInOnly":
      return "Signed-in clients only";
    case "firstOrderOnly":
      return "A client's first order only";
    case "customers":
      return `${condition.customerIds.length} chosen client${condition.customerIds.length === 1 ? "" : "s"}`;
    case "paymentMethods":
      return `Paid by ${list(condition.methods.map(paymentLabel))}`;
  }
}

export function paymentLabel(method: string): string {
  return (
    { CASH: "Cash", UPI: "UPI", CARD: "Card", COD: "Cash on delivery", ONLINE: "online payment" }[
      method
    ] ?? method
  );
}
