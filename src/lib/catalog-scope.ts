/**
 * The sentinel that means "every category", used where a product listing
 * spans the whole catalogue rather than one category.
 *
 * It is deliberately not a plausible slug. An admin can create a category
 * named "All", and if the sentinel were the string "all" that category would
 * silently shadow the shop-everything listing — so the sentinel uses a form
 * the slug generator cannot produce.
 */
export const ALL_CATEGORIES = "__all__";

/** True when a category parameter asks for the whole catalogue. */
export function isAllCategories(category: string | null | undefined): boolean {
  return category === ALL_CATEGORIES;
}
