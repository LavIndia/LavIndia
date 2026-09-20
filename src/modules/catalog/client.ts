/**
 * Catalog module — the part of its public surface that is safe in the
 * browser.
 *
 * The main entry (`@/modules/catalog`) re-exports the service, which imports
 * Prisma; a client component importing it would drag the database client
 * into the bundle. Pure rules that both the server and the storefront need
 * — how a curated filter maps to a variant dimension, which images a
 * variant shows — are exported from here instead. Nothing in this file may
 * import Prisma or anything that does.
 */
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
export type {
  GroupedImage,
  ImageGroup,
  VariantAttributes,
} from "./images/image-groups";
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
  OptionAxis,
  OptionSelection,
  OptionValue,
  SelectableVariant,
} from "./variants/option-selection";
export {
  findVariant,
  initialSelection,
  optionAxes,
  presentDimensions,
  selectValue,
} from "./variants/option-selection";
