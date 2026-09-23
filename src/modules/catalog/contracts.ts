/**
 * The Catalog domain's public contract.
 *
 * This file is the ENTIRE surface other modules may depend on. Inventory,
 * POS, Orders and Billing resolve a sellable item through `CatalogPort` and
 * receive a `SellableVariant` DTO — never a Prisma row, never a relation
 * they can traverse further into the catalog.
 *
 * Replacing the implementation with an HTTP client when Catalog becomes its
 * own service should require no change to any consumer.
 */
import type { Barcode, ProductId, Sku, VariantId } from "../_shared/ids";

/**
 * A sellable, inventory-tracked item as the rest of the platform sees it.
 *
 * Every product has at least one of these: products without meaningful
 * options carry a single variant named "Default", so Inventory, POS and
 * Billing only ever deal in variants and never special-case a bare product.
 */
/**
 * How a variant's stock is counted.
 *
 * Only QUANTITY is implemented. SERIAL is declared so a piece can be marked
 * one-of-a-kind today and so per-unit tracking can be added later without
 * redefining what an item is — see src/modules/inventory/SERIALISATION.md.
 */
export type StockTrackingMode = "QUANTITY" | "SERIAL";

export interface SellableVariant {
  variantId: VariantId;
  productId: ProductId;
  productName: string;
  productSlug: string;
  variantName: string;
  /** True when this is the implicit single variant of an option-less product. */
  isDefault: boolean;
  trackingMode: StockTrackingMode;
  sku: Sku | null;
  barcode: Barcode | null;
  /** The catalog list price in paisa, already resolved variant-over-product. */
  priceCents: number;
  compareAtCents: number | null;
  /** What the piece costs the shop, in paisa. Never shown to a customer. */
  costCents: number | null;
  isActive: boolean;
  /**
   * Whether the product is published, which is a question about the web
   * storefront and nothing else.
   *
   * A draft piece is simply one the shop has not put online yet. It still
   * exists, it is still on the shelf, and the counter must be able to sell
   * it — so this is surfaced rather than folded into `isActive`, and the
   * channel decides what to do with it.
   */
  isPublished: boolean;
  /** Primary image for this variant, falling back to the product's. */
  imageUrl: string | null;
  attributes: {
    color: string | null;
    size: string | null;
    material: string | null;
  };
}

/** A product with its sellable variants, for screens that print or pick in bulk. */
export interface CatalogProductWithVariants {
  productId: ProductId;
  productName: string;
  productSlug: string;
  categoryName: string | null;
  imageUrl: string | null;
  variants: SellableVariant[];
}

export interface CatalogSearchOptions {
  /** Free text matched against product name, variant name and SKU. */
  query?: string;
  limit?: number;
  /** Omit inactive variants and unpublished products. Defaults to true. */
  sellableOnly?: boolean;
}

/**
 * How every other domain reaches the catalog.
 *
 * Batch methods exist because callers routinely need many variants at once
 * (a cart, a bulk label print, a stock table). Resolving them one id at a
 * time would be an N+1 waterfall; these take arrays on purpose.
 */
export interface CatalogPort {
  findVariantById(variantId: VariantId): Promise<SellableVariant | null>;
  findVariantsByIds(variantIds: readonly VariantId[]): Promise<SellableVariant[]>;
  findVariantBySku(sku: Sku): Promise<SellableVariant | null>;
  findVariantByBarcode(barcode: Barcode): Promise<SellableVariant | null>;
  /**
   * Resolves a scanned or typed code that could be either identifier. POS
   * and Receive Stock both funnel every input source through this.
   */
  findVariantByCode(code: string): Promise<SellableVariant | null>;
  searchVariants(options: CatalogSearchOptions): Promise<SellableVariant[]>;
  findProductWithVariants(productId: ProductId): Promise<CatalogProductWithVariants | null>;
  findProductsWithVariants(productIds: readonly ProductId[]): Promise<CatalogProductWithVariants[]>;
}
