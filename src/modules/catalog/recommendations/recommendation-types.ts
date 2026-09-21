/**
 * The contract for product recommendations.
 *
 * A rail is one titled row of suggestions produced by one strategy. Keeping
 * strategies behind a common shape means a screen asks for rails and renders
 * whatever comes back: adding a strategy, reordering them, or swapping the
 * whole service for a hosted recommendation engine changes nothing on the
 * storefront side.
 *
 * Deliberately free of LavIndia specifics — no jewellery vocabulary, no
 * assumptions about categories beyond that products have one.
 */

/**
 * How candidates are chosen.
 *
 * - `bought_together` — products that have appeared in the same orders as the
 *   seed product, ranked by how often. Behavioural, so it is only offered
 *   when there is real order history to draw on.
 * - `similar` — the closest pieces in the same category by price. Editorial
 *   rather than behavioural, so it works on day one.
 * - `popular` — what sells best overall, used when a seed has neither
 *   co-purchase history nor enough shelf-mates.
 */
export type RecommendationStrategy = "bought_together" | "similar" | "popular";

/** A product as a recommendation rail needs it: enough to draw a card. */
export interface RecommendedProduct {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  priceCents: number;
  compareAtCents: number | null;
  /** Sellable units, from the Inventory domain — never `Product.stock`. */
  stock: number;
  isFeatured: boolean;
  isLimitedEdition: boolean;
  images: Array<{ url: string; alt: string }>;
}

export interface RecommendationRail {
  strategy: RecommendationStrategy;
  /** The heading, chosen by the strategy so every surface words it alike. */
  title: string;
  /** One line under the heading saying why these are being shown. */
  subtitle: string;
  products: RecommendedProduct[];
}

export interface RecommendationRequest {
  /** The product being looked at. */
  productId: string;
  /** Which rails to build, in the order they should appear. */
  strategies?: RecommendationStrategy[];
  /** Most products per rail. */
  limit?: number;
}

/**
 * The wording each rail is introduced with. Held here rather than in the
 * component so the same strategy reads the same way wherever it is shown.
 */
export const RECOMMENDATION_COPY: Record<
  RecommendationStrategy,
  { title: string; subtitle: string }
> = {
  bought_together: {
    title: "People Also Buy",
    subtitle: "Chosen alongside this piece by other customers",
  },
  similar: {
    title: "You May Also Like",
    subtitle: "Comparable pieces from the same collection",
  },
  popular: {
    title: "Loved By Our Clients",
    subtitle: "The pieces our customers return to most",
  },
};

/** The rails a product page asks for, in the order it shows them. */
export const DEFAULT_PRODUCT_STRATEGIES: RecommendationStrategy[] = [
  "bought_together",
  "similar",
  "popular",
];
