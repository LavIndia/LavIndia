import { dimensionForFilter, type CatalogAttribute } from "@/modules/catalog/client";

/**
 * Builds the filter panel's facets from what the page already has.
 *
 * Two inputs, no extra request:
 *
 *   - the curated filters an admin maintains, which supply the labels, the
 *     swatch colours and the order values appear in;
 *   - the products on the page, which supply what actually exists and how
 *     many of each.
 *
 * Where a value is read from follows the catalogue's own model: **colour and
 * size are variant options**, so they are counted across a product's
 * variants, while **material is a product** and is read straight off it.
 *
 * Counting from the loaded products means the panel can tell a live choice
 * from a dead one. Dead choices are hidden only when the whole listing is
 * loaded; until then a value with no matches is dimmed, because a later page
 * may still carry it.
 */

export interface FacetSourceVariant {
  color: string | null;
  size: string | null;
}

export interface FacetSourceProduct {
  price: number;
  /** A product-level fact, not a variant option. */
  material: string | null;
  variants: FacetSourceVariant[];
}

export interface FacetSourceFilter {
  id: string;
  name: string;
  slug: string;
  type: "CHECKBOX" | "DROPDOWN" | "RANGE" | "COLOR";
  options: { id: string; label: string; value: string; color: string | null }[];
}

export interface FacetOption {
  /** Sent to the API as the `attr` value. */
  value: string;
  label: string;
  color: string | null;
  /** Products loaded on the page that carry this value. */
  count: number;
}

export interface Facet {
  id: string;
  name: string;
  /** Swatches when every option carries a colour, otherwise a list. */
  presentation: "swatches" | "list";
  options: FacetOption[];
}

export interface PriceBounds {
  min: number;
  max: number;
  step: number;
}

const ATTRIBUTES: CatalogAttribute[] = ["color", "size", "material"];

const ATTRIBUTE_LABEL: Record<CatalogAttribute, string> = {
  color: "Colour",
  size: "Size",
  material: "Material",
};

function normalise(value: string) {
  return value.trim().toLowerCase();
}

/** Every value a product offers for an attribute, from wherever it lives. */
function valuesOf(product: FacetSourceProduct, attribute: CatalogAttribute): Set<string> {
  if (attribute === "material") {
    return new Set(product.material ? [normalise(product.material)] : []);
  }
  const values = new Set<string>();
  for (const variant of product.variants) {
    const raw = variant[attribute];
    if (raw) values.add(normalise(raw));
  }
  return values;
}

/** How many loaded products carry each value, per attribute. */
function countValues(products: FacetSourceProduct[]) {
  const counts: Record<CatalogAttribute, Map<string, number>> = {
    color: new Map(),
    size: new Map(),
    material: new Map(),
  };
  for (const product of products) {
    for (const attribute of ATTRIBUTES) {
      for (const key of valuesOf(product, attribute)) {
        counts[attribute].set(key, (counts[attribute].get(key) ?? 0) + 1);
      }
    }
  }
  return counts;
}

/** Every raw value a product carries, for values no curated filter lists. */
function rawValuesOf(product: FacetSourceProduct, attribute: CatalogAttribute): string[] {
  if (attribute === "material") return product.material ? [product.material] : [];
  return product.variants.map((v) => v[attribute]).filter((v): v is string => !!v);
}

function presentationOf(options: FacetOption[]): Facet["presentation"] {
  return options.length > 0 && options.every((o) => o.color) ? "swatches" : "list";
}

export function buildFacets(
  filters: FacetSourceFilter[],
  products: FacetSourceProduct[],
  options: { complete?: boolean } = {},
): Facet[] {
  const counts = countValues(products);
  const byAttribute = new Map<CatalogAttribute, Map<string, FacetOption>>();
  const others: Facet[] = [];

  for (const filter of filters) {
    const attribute = dimensionForFilter(filter.slug, filter.name);

    if (!attribute) {
      // "Style" and the like: curated only, matched by value like any other.
      others.push({
        id: filter.id,
        name: filter.name,
        presentation: presentationOf(filter.options.map((o) => ({ ...o, count: 0 }))),
        options: filter.options.map((o) => ({
          value: o.value,
          label: o.label,
          color: o.color,
          count: ATTRIBUTES.reduce(
            (n, a) => n + (counts[a].get(normalise(o.value)) ?? 0),
            0,
          ),
        })),
      });
      continue;
    }

    const bucket = byAttribute.get(attribute) ?? new Map<string, FacetOption>();
    for (const option of filter.options) {
      const key = normalise(option.label);
      const existing = bucket.get(key);
      // First wins, except that a swatch replaces a plain entry.
      if (existing && !(option.color && !existing.color)) continue;
      bucket.set(key, {
        value: option.label,
        label: option.label,
        color: option.color,
        count: counts[attribute].get(key) ?? 0,
      });
    }
    byAttribute.set(attribute, bucket);
  }

  // Values that exist on products but that no curated filter lists are still
  // offered, so the panel never hides what is actually for sale.
  for (const attribute of ATTRIBUTES) {
    const bucket = byAttribute.get(attribute) ?? new Map<string, FacetOption>();
    for (const product of products) {
      for (const raw of rawValuesOf(product, attribute)) {
        const key = normalise(raw);
        if (!bucket.has(key)) {
          bucket.set(key, {
            value: raw,
            label: raw,
            color: null,
            count: counts[attribute].get(key) ?? 0,
          });
        }
      }
    }
    if (bucket.size) byAttribute.set(attribute, bucket);
  }

  const attributeFacets: Facet[] = ATTRIBUTES.filter((a) => byAttribute.has(a)).map((a) => {
    const values = [...byAttribute.get(a)!.values()];
    return { id: a, name: ATTRIBUTE_LABEL[a], presentation: presentationOf(values), options: values };
  });

  const facets = [...attributeFacets, ...others];
  if (!options.complete) return facets;

  // The whole listing is loaded, so a count of zero is a fact, not a gap.
  return facets
    .map((facet) => ({ ...facet, options: facet.options.filter((o) => o.count > 0) }))
    .filter((facet) => facet.options.length > 0);
}

/** Rounds the loaded products' price span outwards to a sensible step. */
export function priceBoundsOf(
  products: FacetSourceProduct[],
  fallback: PriceBounds = { min: 100, max: 30000, step: 100 },
): PriceBounds {
  const prices = products.map((p) => p.price).filter((p) => Number.isFinite(p) && p > 0);
  if (prices.length === 0) return fallback;

  const rawMin = Math.min(...prices);
  const rawMax = Math.max(...prices);
  const span = Math.max(rawMax - rawMin, 1);
  const step = span >= 20000 ? 500 : span >= 5000 ? 100 : 50;
  const min = Math.floor(rawMin / step) * step;
  const max = Math.max(Math.ceil(rawMax / step) * step, min + step);
  return { min, max, step };
}

/** How many choices are in force, for the panel's header and the Clear button. */
export function activeFilterCount(
  applied: { priceMin?: number; priceMax?: number; attrValues?: string[] },
  bounds: PriceBounds,
): number {
  let count = applied.attrValues?.length ?? 0;
  const priceNarrowed =
    (applied.priceMin !== undefined && applied.priceMin > bounds.min) ||
    (applied.priceMax !== undefined && applied.priceMax < bounds.max);
  if (priceNarrowed) count += 1;
  return count;
}
