import type { CatalogAttribute, CuratedOptionValue, ImageGroup } from "@/modules/catalog/client";

/**
 * The shapes the product form works in.
 *
 * Declared apart from the form so that the cards, the variants table and the
 * save payload all agree on what a product, a variant and an image are,
 * rather than each re-describing them.
 */

export interface ProductImage {
  id?: string;
  url: string;
  alt: string | null;
  isPrimary: boolean;
  position: number;
  // The option value the image is filed under — Colour: Gold — or null for
  // a general image shown with every variant. Photos belong to an option
  // value, not to a variant: the Gold photographs serve every Gold variant
  // whatever its size. See src/modules/catalog/images/image-groups.ts.
  group: ImageGroup | null;
}

export interface ProductVariant {
  id?: string;
  // Client-only stable key for React and for the rows' inputs, since a new
  // variant has no database id until it is saved.
  clientId: string;
  name: string;
  color: string | null;
  size: string | null;
  material: string | null;
  priceCents: number | null;
  stock: number;
  // Read-only here. Both are allocated by the catalog module when the
  // variant is created and are never edited through this form, but an admin
  // needs to see them to match a row against a label or a stock list.
  sku?: string | null;
  barcode?: string | null;
  // True for the implicit single variant of a product sold without options.
  // The catalog creates and removes it; the form only presents it.
  isDefault?: boolean;
}

/**
 * Something that stopped the form doing what was asked, shown in a dialog
 * rather than a passing toast because the admin has to act on it.
 */
export interface FormError {
  title: string;
  message: string;
  /** Individual points beneath the message, for validation lists. */
  issues?: string[];
}

/** An image as the database and the API carry it. */
export interface StoredProductImage {
  id?: string;
  url: string;
  alt: string | null;
  isPrimary: boolean;
  position: number;
  optionDimension: string | null;
  optionValue: string | null;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  priceCents: number;
  compareAtCents: number | null;
  costCents: number | null;
  discountPercent: number | null;
  stock: number;
  categoryId: string;
  sku: string | null;
  material: string | null;
  isPublished: boolean;
  isFeatured: boolean;
  isLimitedEdition: boolean;
  images: StoredProductImage[];
  variants: Omit<ProductVariant, "clientId">[];
}

/** On-hand stock per variant id, read from Inventory by the page. */
export type StockByVariant = Record<string, { quantity: number; reserved: number }>;

export interface ProductFormProps {
  product?: Product;
  categories: Array<{ id: string; name: string }>;
  /** Absent for a product that has not been saved yet. */
  stockByVariant?: StockByVariant;
}

/** The gallery as ImageUpload exchanges it: one group's images, ungrouped. */
export type GalleryImage = Omit<ProductImage, "group">;

/**
 * The options that make a variant. Material is deliberately absent: it moves
 * the price, and a listing card shows one price per product, so the same
 * design in two materials is two products. See the catalog module.
 */
export type OptionDimension = "color" | "size";

export const OPTION_DIMENSIONS: {
  key: OptionDimension;
  label: string;
  placeholder: string;
}[] = [
  { key: "color", label: "Colour", placeholder: "e.g. Gold" },
  { key: "size", label: "Size", placeholder: "e.g. 40 cm" },
];

/** Curated values keyed by attribute, including the product-level material. */
export type CuratedValues = Record<CatalogAttribute, CuratedValue[]>;

/**
 * One entry of the admin-maintained list an option value can be picked from.
 * Defined by the catalog module, which also decides which curated filter
 * feeds which dimension.
 */
export type CuratedValue = CuratedOptionValue;

/** The editable fields, held as strings because they come from inputs. */
export interface ProductFormData {
  name: string;
  slug: string;
  description: string;
  price: string;
  compareAtPrice: string;
  /** The buying price, in rupees as typed. Never shown to a customer. */
  costPrice: string;
  stock: string;
  categoryId: string;
  sku: string;
  material: string;
  isPublished: boolean;
  isFeatured: boolean;
  isLimitedEdition: boolean;
}

export interface ChecklistItem {
  label: string;
  done: boolean;
}
