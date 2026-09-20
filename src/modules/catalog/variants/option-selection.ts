import { VARIANT_OPTION_DIMENSIONS, type VariantOptionDimension } from "./option-dimensions";

/**
 * Choosing a variant by its options rather than from a list of variants.
 *
 * A shopper does not pick "Gold / 45 cm" from twelve buttons; they pick a
 * colour, then a length. Listing whole variants also makes a two-dimension
 * product ambiguous — a button reading "45 cm" cannot say which metal it
 * belongs to. So the storefront offers one selector per dimension and
 * resolves the combination to a variant here.
 *
 * Pure, and in the catalog module, because "which variant is Gold at 45 cm"
 * is a catalog question, not a rendering one.
 */

export interface SelectableVariant {
  id: string;
  color: string | null;
  size: string | null;
  /** Available units. Zero means the combination exists but cannot be sold. */
  stock: number;
}

export type OptionSelection = Partial<Record<VariantOptionDimension, string>>;

const DIMENSIONS = VARIANT_OPTION_DIMENSIONS;

const DIMENSION_LABEL: Record<VariantOptionDimension, string> = {
  color: "Colour",
  size: "Size",
};

function eq(a: string | null | undefined, b: string | null | undefined): boolean {
  return !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();
}

/** The dimensions at least one variant actually uses. */
export function presentDimensions(
  variants: readonly SelectableVariant[],
): VariantOptionDimension[] {
  return DIMENSIONS.filter((dimension) => variants.some((v) => v[dimension]));
}

/** True when the variant agrees with every chosen value in `within`. */
function agreesOn(
  variant: SelectableVariant,
  selection: OptionSelection,
  within: readonly VariantOptionDimension[],
): boolean {
  return within.every((dimension) => {
    const chosen = selection[dimension];
    return !chosen || eq(variant[dimension], chosen);
  });
}

/** The one variant matching every dimension the product uses. */
export function findVariant<T extends SelectableVariant>(
  variants: readonly T[],
  selection: OptionSelection,
): T | null {
  const dimensions = presentDimensions(variants);
  if (dimensions.length === 0) return variants[0] ?? null;
  return (
    variants.find((v) => dimensions.every((d) => eq(v[d], selection[d]))) ?? null
  );
}

export interface OptionValue {
  value: string;
  /** Some variant with this value fits the rest of the selection. */
  available: boolean;
  /** …and at least one of those has stock. */
  inStock: boolean;
  selected: boolean;
}

export interface OptionAxis {
  dimension: VariantOptionDimension;
  label: string;
  values: OptionValue[];
}

/**
 * One axis per dimension, cascading: each row is narrowed only by the rows
 * above it, never by the ones below.
 *
 * This is what keeps a sparse catalogue navigable. Judging every row against
 * the whole selection sounds more accurate but deadlocks: with Rose Gold and
 * 2.2 chosen, a Gold cuff that only comes in One size would be greyed out,
 * and the One size that would unlock it greyed out too, so Gold could never
 * be reached at all. Leaving the first row free and narrowing downwards means
 * there is always a way through — and `selectValue` repairs whatever the new
 * choice invalidates.
 */
export function optionAxes(
  variants: readonly SelectableVariant[],
  selection: OptionSelection,
): OptionAxis[] {
  const dimensions = presentDimensions(variants);

  return dimensions.map((dimension, index) => {
    const narrowedBy = dimensions.slice(0, index);
    const byValue = new Map<string, OptionValue>();

    for (const variant of variants) {
      const raw = variant[dimension];
      if (!raw) continue;

      const key = raw.trim().toLowerCase();
      const entry =
        byValue.get(key) ??
        { value: raw, available: false, inStock: false, selected: eq(raw, selection[dimension]) };

      if (agreesOn(variant, selection, narrowedBy)) {
        entry.available = true;
        if (variant.stock > 0) entry.inStock = true;
      }
      byValue.set(key, entry);
    }

    return { dimension, label: DIMENSION_LABEL[dimension], values: [...byValue.values()] };
  });
}

/** The full selection described by one variant. */
function selectionOf(
  variant: SelectableVariant,
  dimensions: readonly VariantOptionDimension[],
): OptionSelection {
  const selection: OptionSelection = {};
  for (const dimension of dimensions) {
    const value = variant[dimension];
    if (value) selection[dimension] = value;
  }
  return selection;
}

/**
 * Picking a value keeps it and repairs the rest.
 *
 * Choosing Silver when the current length is only made in Gold must not
 * leave the page on a combination that does not exist, so the other
 * dimensions move to the nearest variant that honours the new choice —
 * preferring one in stock.
 */
export function selectValue(
  variants: readonly SelectableVariant[],
  selection: OptionSelection,
  dimension: VariantOptionDimension,
  value: string,
): OptionSelection {
  const next: OptionSelection = { ...selection, [dimension]: value };
  if (findVariant(variants, next)) return next;

  const candidates = variants.filter((v) => eq(v[dimension], value));
  const best = candidates.find((v) => v.stock > 0) ?? candidates[0];
  return best ? selectionOf(best, presentDimensions(variants)) : selection;
}

/** The selection a page opens on: the first sellable variant, else the first. */
export function initialSelection(variants: readonly SelectableVariant[]): OptionSelection {
  const best = variants.find((v) => v.stock > 0) ?? variants[0];
  return best ? selectionOf(best, presentDimensions(variants)) : {};
}
