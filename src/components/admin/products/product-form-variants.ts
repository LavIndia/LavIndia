import {
  OPTION_DIMENSIONS,
  type OptionDimension,
  type ProductVariant,
} from "@/components/admin/products/product-form-types";

/**
 * What a variant is, as far as the form is concerned.
 *
 * A variant is identified by its option values; its display name is derived
 * from them the way a shopper reads it ("Gold / 40 cm"). Only a one-off
 * variant with no option values carries a typed name. These are pure so the
 * rule is testable and is applied identically when generating rows, when
 * rendering them and when building the save payload.
 */

type Attributes = Pick<ProductVariant, "color" | "size">;

function comboKey(v: Attributes) {
  return `${v.color ?? ""}|${v.size ?? ""}`;
}

/** "Gold / 40 cm" from the option values; empty for a one-off variant. */
export function derivedVariantName(v: Attributes): string {
  return [v.color, v.size].filter(Boolean).join(" / ");
}

/** The name to show and to save: derived when there are option values, typed otherwise. */
export function variantDisplayName(v: Attributes & { name: string }): string {
  return derivedVariantName(v) || v.name;
}

/** The dimensions that have at least one value to combine. */
export function activeDimensions(
  optionValues: Record<OptionDimension, string[]>,
): OptionDimension[] {
  return OPTION_DIMENSIONS.map((d) => d.key).filter((dim) => optionValues[dim].length > 0);
}

/**
 * Every combination of the active dimensions' values that is not already a
 * variant. The implicit Default variant is never counted as existing — it
 * describes the absence of options, not a combination of them.
 */
export function generateVariantRows(
  optionValues: Record<OptionDimension, string[]>,
  existing: ProductVariant[],
): ProductVariant[] {
  const dims = activeDimensions(optionValues);
  if (dims.length === 0) return [];

  let combos: Partial<Record<OptionDimension, string>>[] = [{}];
  for (const dim of dims) {
    const next: Partial<Record<OptionDimension, string>>[] = [];
    for (const combo of combos) {
      for (const value of optionValues[dim]) {
        next.push({ ...combo, [dim]: value });
      }
    }
    combos = next;
  }

  const existingKeys = new Set(existing.filter((v) => !v.isDefault).map(comboKey));

  return combos
    .map((c) => ({
      color: c.color ?? null,
      size: c.size ?? null,
    }))
    .filter((c) => !existingKeys.has(comboKey(c)))
    .map((c) => ({
      clientId: crypto.randomUUID(),
      name: derivedVariantName(c),
      color: c.color,
      size: c.size,
      material: null,
      priceCents: null,
      stock: 0,
    }));
}

/**
 * Which option dimensions a variant is described by, as a stable key:
 * "color", or "color+size". Every variant of a product must share one, or
 * the shop cannot offer a coherent choice — a product holding both a
 * Colour-only "Gold" and a Size-only "45 cm" leaves a shopper unable to say
 * whether the 45 cm is the gold one.
 */
export function dimensionSetOf(v: Attributes): string {
  return OPTION_DIMENSIONS.map((d) => d.key)
    .filter((key) => v[key])
    .join("+");
}

/** Reads "color+size" back as "Colour and Size", for a message. */
export function describeDimensionSet(key: string): string {
  if (!key) return "no options";
  const labels = key
    .split("+")
    .map((k) => OPTION_DIMENSIONS.find((d) => d.key === k)?.label ?? k);
  return labels.length === 1
    ? labels[0]
    : `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
}

/**
 * The dimension sets the product's real variants already use. More than one
 * means the product is already inconsistent; none means it is free to take
 * any shape.
 */
export function existingDimensionSets(variants: readonly ProductVariant[]): string[] {
  return [
    ...new Set(variants.filter((v) => !v.isDefault).map(dimensionSetOf)),
  ].filter(Boolean);
}

/**
 * The option values a set of variants already uses, per dimension, in the
 * order they first appear.
 *
 * This is what lets the Options editor open showing what the product
 * actually comes in. Without it the editor starts blank on an existing
 * product, so adding a Size to something already sold in Gold and Silver
 * reads as "replace Colour with Size" rather than "now also in two lengths",
 * and is refused as an inconsistency.
 */
export function optionValuesOf(
  variants: readonly ProductVariant[],
): Record<OptionDimension, string[]> {
  const values: Record<OptionDimension, string[]> = { color: [], size: [] };

  for (const variant of variants) {
    if (variant.isDefault) continue;
    for (const { key } of OPTION_DIMENSIONS) {
      const value = variant[key];
      if (value && !values[key].includes(value)) values[key].push(value);
    }
  }

  return values;
}

/**
 * True when `incoming` describes everything `existing` does and at least one
 * dimension more — Colour becoming Colour and Size.
 *
 * This is the difference between a mistake and an intention. Colour-only
 * variants sitting beside Size-only ones are incoherent and are refused. But
 * taking a product that comes in Gold and Silver and saying it now also comes
 * in two lengths is an ordinary thing to want, and the answer is to expand
 * the existing variants into the fuller matrix rather than to make the
 * operator delete and re-key them.
 */
export function isDimensionUpgrade(existing: string, incoming: string): boolean {
  if (!existing || !incoming || existing === incoming) return false;
  const have = existing.split("+");
  const next = new Set(incoming.split("+"));
  if (have.length >= next.size) return false;
  return have.every((dimension) => next.has(dimension));
}

/**
 * Rebuilds the variant list across every combination of the active options,
 * carrying the existing variants into it.
 *
 * Each existing variant claims the first combination that agrees with the
 * option values it already carries, and keeps its id — and therefore its
 * SKU, its barcode and the stock already received against it. Gold becomes
 * "Gold / 38 – 40 cm" rather than being deleted and replaced, which would
 * throw away units that are physically on a shelf.
 */
export function expandVariantsToDimensions(
  optionValues: Record<OptionDimension, string[]>,
  existing: readonly ProductVariant[],
): ProductVariant[] {
  const dims = activeDimensions(optionValues);
  if (dims.length === 0) return [...existing];

  let combos: Partial<Record<OptionDimension, string>>[] = [{}];
  for (const dim of dims) {
    const next: Partial<Record<OptionDimension, string>>[] = [];
    for (const combo of combos) {
      for (const value of optionValues[dim]) next.push({ ...combo, [dim]: value });
    }
    combos = next;
  }

  const unclaimed = [...existing];

  return combos.map((combo) => {
    const attrs = { color: combo.color ?? null, size: combo.size ?? null };
    const name = derivedVariantName(attrs);

    // A variant fits this combination when every option value it already has
    // matches. One with no values at all — the implicit Default — fits the
    // first combination going, which is how a single-item product gains its
    // first real options without losing its stock.
    const index = unclaimed.findIndex((v) =>
      OPTION_DIMENSIONS.every((d) => !v[d.key] || v[d.key] === combo[d.key]),
    );

    if (index === -1) {
      return {
        clientId: crypto.randomUUID(),
        name,
        ...attrs,
        material: null,
        priceCents: null,
        stock: 0,
      };
    }

    const [claimed] = unclaimed.splice(index, 1);
    return { ...claimed, ...attrs, name, isDefault: false };
  });
}

/** A variant with nothing filled in yet, for the "one-off" button. */
export function blankVariant(): ProductVariant {
  return {
    clientId: crypto.randomUUID(),
    name: "",
    color: null,
    size: null,
    material: null,
    priceCents: null,
    stock: 0,
  };
}
