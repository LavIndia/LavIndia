import { revalidateTag } from "next/cache";

/**
 * The cached storefront views that go out of date when stock moves.
 *
 * Availability is read through `availabilityByProduct` from inside several
 * cached functions — the homepage rails, the category listings, the product
 * recommendation rails. None of those caches knows anything about inventory,
 * so unless something says otherwise they keep serving the availability they
 * were built with: up to a minute on the listings, five on the rails. For
 * single-piece jewellery that is long enough to show a sold piece as
 * available, which is the one mistake this catalogue cannot afford.
 *
 * This lives in the app layer rather than in the inventory module on
 * purpose. Inventory must stay portable — it is one of the modules meant to
 * be lifted out — so it does not import Next's cache API. The route handlers
 * that sit above it call this once their write has committed.
 */
export function revalidateStockViews() {
  // Category listings, product pages and recommendation rails.
  revalidateTag("products");
  // Homepage rails, which carry their own stock badges.
  revalidateTag("homepage");
}
