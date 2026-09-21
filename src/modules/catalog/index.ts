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
export type {
  CatalogAttribute,
  CuratedOptionValue,
  FilterWithOptions,
  VariantOptionDimension,
} from "./variants/option-dimensions";
export {
  CATALOG_ATTRIBUTES,
  VARIANT_OPTION_DIMENSIONS,
  dimensionForFilter,
  groupOptionsByDimension,
  isVariantOptionDimension,
} from "./variants/option-dimensions";
export {
  DEFAULT_VARIANT_NAME,
  allocateMissingIdentifiers,
  enforceVariantInvariants,
  ensureDefaultVariant,
  normaliseDefaultFlags,
} from "./variants/variant-integrity";
export type { GroupedImage, ImageGroup, VariantAttributes } from "./images/image-groups";
export {
  availableGroups,
  groupOf,
  imageMatchesVariant,
  imagesForVariant,
  productImageUrl,
  sameGroup,
  variantImageUrl,
} from "./images/image-groups";

export type {
  RecommendationStrategy,
  RecommendationRail,
  RecommendationRequest,
  RecommendedProduct,
} from "@/modules/catalog/recommendations/recommendation-types";
export {
  RECOMMENDATION_COPY,
  DEFAULT_PRODUCT_STRATEGIES,
} from "@/modules/catalog/recommendations/recommendation-types";
export { getRecommendations } from "@/modules/catalog/recommendations/recommendation-service";
