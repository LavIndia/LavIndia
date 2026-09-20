/**
 * What distinguishes one sellable variant from another, and what merely
 * describes the product.
 *
 * The rule the catalogue is modelled on: **split into a separate product
 * when the price changes; keep as a variant when only the choice changes.**
 * A listing card shows one price per product, so a design offered in
 * Sterling Silver and in 22k Gold is two products — while the same piece in
 * two metal tones, or in two chain lengths, is one product a shopper picks
 * from on a single page.
 *
 * Hence: **Colour and Size are variant options. Material is a product.**
 * Material still has curated values (it is filtered and displayed), so it
 * remains a catalog attribute — it simply never produces a variant.
 */

/** An attribute the shop curates values for, whether or not it makes variants. */
export type CatalogAttribute = "color" | "size" | "material";

/** The attributes that actually distinguish one variant from another. */
export type VariantOptionDimension = "color" | "size";

export const CATALOG_ATTRIBUTES: CatalogAttribute[] = ["color", "size", "material"];

export const VARIANT_OPTION_DIMENSIONS: VariantOptionDimension[] = ["color", "size"];

export function isVariantOptionDimension(
  attribute: CatalogAttribute,
): attribute is VariantOptionDimension {
  return attribute === "color" || attribute === "size";
}

/** One pickable value, as both the shop filter and the admin pickers use it. */
export interface CuratedOptionValue {
  label: string;
  value: string;
  color: string | null;
}

/**
 * Checked in order, so a filter matching more than one attribute lands in the
 * first. That ordering is what makes "Metal Colour" a colour rather than a
 * material — which is what an admin means by it.
 */
const ATTRIBUTE_KEYWORDS: { attribute: CatalogAttribute; keywords: string[] }[] = [
  { attribute: "color", keywords: ["color", "colour", "shade", "tone"] },
  { attribute: "size", keywords: ["size", "length", "diameter", "fit"] },
  { attribute: "material", keywords: ["material", "metal", "stone", "gem", "finish"] },
];

/**
 * The attribute a filter describes, or null when it is neither — "Style" and
 * "Occasion" are things to filter a shop by, not things a piece is made of
 * or offered in.
 */
export function dimensionForFilter(
  ...names: (string | null | undefined)[]
): CatalogAttribute | null {
  const haystack = names.filter(Boolean).join(" ").toLowerCase();
  if (!haystack) return null;

  for (const { attribute, keywords } of ATTRIBUTE_KEYWORDS) {
    if (keywords.some((keyword) => haystack.includes(keyword))) return attribute;
  }
  return null;
}

export interface FilterWithOptions {
  name: string;
  slug: string;
  options: CuratedOptionValue[];
}

/**
 * Groups every curated filter into the catalog attributes.
 *
 * Values are de-duplicated by label, case-insensitively, because a shop can
 * easily end up with two filters covering the same ground ("Metal Color" and
 * "Metal Colour") and a picker should not offer Gold twice. A duplicate
 * carrying a swatch replaces one without.
 */
export function groupOptionsByDimension(
  filters: FilterWithOptions[],
): Record<CatalogAttribute, CuratedOptionValue[]> {
  const grouped: Record<CatalogAttribute, Map<string, CuratedOptionValue>> = {
    color: new Map(),
    size: new Map(),
    material: new Map(),
  };

  for (const filter of filters) {
    const attribute = dimensionForFilter(filter.slug, filter.name);
    if (!attribute) continue;

    for (const option of filter.options) {
      const key = option.label.trim().toLowerCase();
      if (!key) continue;

      const existing = grouped[attribute].get(key);
      if (existing && !(option.color && !existing.color)) continue;
      grouped[attribute].set(key, option);
    }
  }

  return {
    color: [...grouped.color.values()],
    size: [...grouped.size.values()],
    material: [...grouped.material.values()],
  };
}
