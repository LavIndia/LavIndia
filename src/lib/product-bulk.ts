/** Shared parsing rules for the downloadable product-import template. */

export interface BulkVariantDraft {
  name: string;
  color: string | null;
  size: string | null;
  material: null;
  priceCents: number | null;
  stock: number;
}

/** Multi-select cells use commas. Pipe remains accepted for older templates. */
export function splitMultiValue(value: unknown): string[] {
  if (typeof value !== "string") return [];

  return [...new Set(
    value
      .split(/[,|]/)
      .map((part) => part.trim())
      .filter(Boolean),
  )];
}

export function splitTags(value: unknown): string[] {
  if (typeof value !== "string") return [];
  return [...new Set(
    value
      .split(/[|,]/)
      .map((part) => part.trim())
      .filter(Boolean),
  )];
}

/**
 * Builds the Colour x Size matrix represented by a product row.
 * An empty result means the product is sold as one implicit Default variant.
 */
export function buildBulkVariants(
  colorsValue: unknown,
  sizesValue: unknown,
): BulkVariantDraft[] {
  const colors = splitMultiValue(colorsValue);
  const sizes = splitMultiValue(sizesValue);

  if (colors.length === 0 && sizes.length === 0) return [];

  const colorValues: (string | null)[] = colors.length > 0 ? colors : [null];
  const sizeValues: (string | null)[] = sizes.length > 0 ? sizes : [null];

  return colorValues.flatMap((color) =>
    sizeValues.map((size) => ({
      name: [color, size].filter(Boolean).join(" / "),
      color,
      size,
      material: null,
      priceCents: null,
      // Stock belongs to each generated variant. Do not guess how a
      // product-level number should split across combinations.
      stock: 0,
    })),
  );
}
