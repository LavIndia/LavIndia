/**
 * Where uploaded assets live in ImageKit.
 *
 * Every upload path in the application is built here, so the media library's
 * folder structure mirrors the catalog instead of drifting from it. Before
 * this existed each upload route hardcoded its own root, which meant a new
 * product's images landed loose in `/assets/pictures/products` rather than in
 * the category folder alongside everything else.
 *
 * ImageKit creates folders implicitly on upload, so placing a file at a new
 * path is all that is needed — there is no separate "create folder" step.
 */

export const PRODUCTS_ROOT = "/assets/pictures/products";
export const CATEGORIES_ROOT = "/assets/pictures/categories";

/**
 * Makes one path segment safe for a media-library folder name.
 *
 * Category slugs are already url-safe, but this is the last line of defence
 * against a caller-supplied value escaping its folder (`../`) or producing a
 * path ImageKit will silently rewrite.
 */
export function toFolderSegment(value: string): string {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/**
 * The folder a product's images belong in.
 *
 * Falls back to the products root only when a category genuinely cannot be
 * resolved. Callers should pass one — the upload routes reject an upload
 * without a category rather than quietly filing it in the wrong place.
 */
export function productImageFolder(categorySlug?: string | null): string {
  const segment = categorySlug ? toFolderSegment(categorySlug) : "";
  return segment ? `${PRODUCTS_ROOT}/${segment}` : PRODUCTS_ROOT;
}

/** The folder a category's own hero/tile image belongs in. */
export function categoryImageFolder(categorySlug?: string | null): string {
  const segment = categorySlug ? toFolderSegment(categorySlug) : "";
  return segment ? `${CATEGORIES_ROOT}/${segment}` : CATEGORIES_ROOT;
}

/** Joins a folder and filename into the public path stored on the record. */
export function publicAssetPath(folder: string, filename: string): string {
  return `${folder.replace(/\/+$/, "")}/${filename}`;
}
