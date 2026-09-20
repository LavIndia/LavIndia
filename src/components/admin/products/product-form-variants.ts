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
