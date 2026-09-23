import { variantDisplayName } from "@/components/admin/products/product-form-variants";
import type {
  ProductFormData,
  ProductImage,
  ProductVariant,
} from "@/components/admin/products/product-form-types";

/**
 * Turns the form's state into the single request body the products API
 * expects.
 *
 * Pure, and separate from the form, because this is where the awkward parts
 * live — rupees to paise, image groups to their two stored columns — and
 * they are easier to reason about away from the markup.
 */
export function buildProductPayload(
  formData: ProductFormData,
  images: ProductImage[],
  variants: ProductVariant[],
  publish: boolean,
) {
  return {
    name: formData.name,
    slug: formData.slug,
    description: formData.description || null,
    priceCents: Math.round(parseFloat(formData.price) * 100),
    compareAtCents: formData.compareAtPrice
      ? Math.round(parseFloat(formData.compareAtPrice) * 100)
      : null,
    // Blank means "not recorded", which is null rather than zero — a piece
    // whose cost nobody entered has not been bought for nothing.
    costCents: formData.costPrice ? Math.round(parseFloat(formData.costPrice) * 100) : null,
    stock: parseInt(formData.stock),
    categoryId: formData.categoryId,
    sku: formData.sku || null,
    material: formData.material.trim() || null,
    isPublished: publish,
    // Publishing also clears any leftover soft-archive state (set when
    // a product with existing orders was previously deleted) — without
    // this, a re-published product silently stays invisible on the
    // storefront because isActive is a separate gate from isPublished.
    ...(publish ? { isActive: true } : {}),
    isFeatured: formData.isFeatured,
    isLimitedEdition: formData.isLimitedEdition,
    discountPercent: null,
    images: images.map((img, i) => ({
      id: img.id,
      url: img.url,
      alt: img.alt,
      isPrimary: img.isPrimary,
      position: i,
      optionDimension: img.group?.dimension ?? null,
      optionValue: img.group?.value ?? null,
    })),
    variants: variants
      // The name a variant is saved under is the one it is shown under:
      // derived from its option values, or typed for a one-off. A one-off
      // with no name yet has no identity and is not sent.
      .map((v) => ({ ...v, name: variantDisplayName(v) }))
      .filter((v) => v.name)
      .map((v) => ({
        id: v.id,
        clientId: v.clientId,
        name: v.name,
        color: v.color,
        size: v.size,
        // Material is the product's, never the variant's.
        material: null,
        priceCents: v.priceCents,
        stock: v.stock,
      })),
  };
}
