/**
 * Catalog module — public surface.
 *
 * Other modules import from `@/modules/catalog` and nothing deeper. Reaching
 * into `catalog/variants/...` or querying `prisma.product` from outside this
 * folder is the coupling this architecture exists to prevent.
 */
export type {
  CatalogPort,
  CatalogProductWithVariants,
  CatalogSearchOptions,
  SellableVariant,
} from "./contracts";
export { catalogService } from "./catalog-service";
export { formatSku, formatBarcode, allocateIdentifiers } from "./variants/identifiers";
