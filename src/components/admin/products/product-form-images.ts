import type { GroupedImage, ImageGroup } from "@/modules/catalog/client";
import type { ProductImage } from "@/components/admin/products/product-form-types";

/**
 * Bridges the form's image shape — a `group` object — and the catalog
 * module's stored shape of two columns. Kept as functions so the two never
 * drift into each other.
 */

export function toGroupedImage(image: ProductImage): GroupedImage {
  return {
    url: image.url,
    position: image.position,
    isPrimary: image.isPrimary,
    optionDimension: image.group?.dimension ?? null,
    optionValue: image.group?.value ?? null,
  };
}

const DIMENSION_LABEL: Record<ImageGroup["dimension"], string> = {
  color: "Colour",
  size: "Size",
  material: "Material",
};

/** "All variants", or "Colour: Gold". */
export function groupLabel(group: ImageGroup | null): string {
  return group ? `${DIMENSION_LABEL[group.dimension]}: ${group.value}` : "All variants";
}

/** A stable key for React and for select values. */
export function groupKey(group: ImageGroup | null): string {
  return group ? `${group.dimension}:${group.value.trim().toLowerCase()}` : "all";
}
