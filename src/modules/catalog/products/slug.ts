/**
 * A product's slug is its address on the site: `/product/<slug>`.
 *
 * It is derived from the name once, when the product is created, and then
 * left alone. Renaming a piece must never move its address — shared links,
 * bookmarks and search results all point at the slug. It changes only when
 * an admin edits the address itself.
 */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
