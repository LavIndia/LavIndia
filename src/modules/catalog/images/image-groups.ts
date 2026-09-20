import type { CatalogAttribute } from "../variants/option-dimensions";

/**
 * How a product's images relate to its variants.
 *
 * Photos do not belong to a variant; they belong to an option value. The
 * Gold photographs are the Gold photographs whether the chain is 40 cm or
 * 45 cm, so tying them to one Gold variant would mean uploading them once
 * per length. An image is therefore filed under a group — one option value
 * such as Colour: Gold — or under no group at all, in which case it is
 * general and shows for every variant.
 *
 * A variant's gallery is its matching group images followed by the general
 * ones. A product sold without options has only general images. This file is
 * pure so the same rule runs on the server, in the admin and on the
 * storefront.
 */

export interface ImageGroup {
  dimension: CatalogAttribute;
  value: string;
}

/** The fields of an image this module needs; any richer row satisfies it. */
export interface GroupedImage {
  url: string;
  position: number;
  isPrimary: boolean;
  optionDimension: string | null;
  optionValue: string | null;
}

/** The option values that decide which group images a variant shows. */
export interface VariantAttributes {
  color: string | null;
  size: string | null;
  material: string | null;
}

export const DIMENSIONS: CatalogAttribute[] = ["color", "size", "material"];

/**
 * The attributes a photograph can differ by — colour alone.
 *
 * A Gold piece and a Silver piece look different; a 40 cm chain and a 45 cm
 * chain do not. Material is no longer a variant option at all (it is its own
 * product), so it cannot have an image set within a product either. Matching
 * still honours any attribute, so a set filed under something else by an
 * older record is read back rather than lost.
 */
export const PHOTOGRAPHED_DIMENSIONS: CatalogAttribute[] = ["color"];

function same(a: string | null | undefined, b: string | null | undefined): boolean {
  return !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();
}

export function groupOf(image: GroupedImage): ImageGroup | null {
  if (!image.optionDimension || !image.optionValue) return null;
  return { dimension: image.optionDimension as CatalogAttribute, value: image.optionValue };
}

export function sameGroup(a: ImageGroup | null, b: ImageGroup | null): boolean {
  if (a === null || b === null) return a === b;
  return a.dimension === b.dimension && same(a.value, b.value);
}

/** True when the image's group names one of the variant's option values. */
export function imageMatchesVariant(image: GroupedImage, variant: VariantAttributes): boolean {
  const group = groupOf(image);
  if (!group) return false;
  return same(group.value, variant[group.dimension]);
}

function byPositionPrimaryFirst(a: GroupedImage, b: GroupedImage): number {
  if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
  return a.position - b.position;
}

/**
 * The gallery for one variant: its group images, then the general ones.
 * Images filed under a value the variant does not have are left out.
 */
export function imagesForVariant<T extends GroupedImage>(
  images: readonly T[],
  variant: VariantAttributes,
): T[] {
  const own = images.filter((img) => imageMatchesVariant(img, variant));
  const general = images.filter((img) => groupOf(img) === null);
  return [...own, ...general];
}

/**
 * The one image that stands for a variant where only one fits — a stock
 * table row, a barcode label, a POS line. Its own group's best image, else
 * the product's best general image, else nothing.
 */
export function variantImageUrl(
  images: readonly GroupedImage[],
  variant: VariantAttributes,
): string | null {
  const own = images.filter((img) => imageMatchesVariant(img, variant)).sort(byPositionPrimaryFirst);
  if (own[0]) return own[0].url;
  const general = images.filter((img) => groupOf(img) === null).sort(byPositionPrimaryFirst);
  return general[0]?.url ?? null;
}

/** The product's best general image, for places that show the product itself. */
export function productImageUrl(images: readonly GroupedImage[]): string | null {
  const general = images.filter((img) => groupOf(img) === null).sort(byPositionPrimaryFirst);
  return general[0]?.url ?? null;
}

/**
 * Every group that could hold images: each option value any variant has,
 * plus any group images already sit in (so a value no variant carries any
 * more is still reachable in the admin rather than silently orphaned).
 */
export function availableGroups(
  variants: readonly VariantAttributes[],
  images: readonly GroupedImage[],
): ImageGroup[] {
  const seen = new Map<string, ImageGroup>();
  const add = (group: ImageGroup) => {
    const key = `${group.dimension}|${group.value.trim().toLowerCase()}`;
    if (!seen.has(key)) seen.set(key, group);
  };
  for (const dimension of PHOTOGRAPHED_DIMENSIONS) {
    for (const variant of variants) {
      const value = variant[dimension];
      if (value) add({ dimension, value });
    }
  }
  for (const image of images) {
    const group = groupOf(image);
    if (group) add(group);
  }
  return [...seen.values()];
}
