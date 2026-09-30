/**
 * Turns what a storefront cart holds into sellable variant lines.
 *
 * A cart item is a product and, usually, the variant the client picked. An
 * item saved before variants existed carries only the product; it is sold as
 * that product's default variant, the same piece the product page showed.
 * Lines for the same variant are merged, so a cart cannot split one piece
 * across two lines to dodge a quantity rule.
 */
import { z } from "zod";
import { catalogService } from "@/modules/catalog";
import { DomainError } from "@/modules/_shared/errors";
import { ProductId } from "@/modules/_shared/ids";

export const cartItemSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().min(1).nullable().optional(),
  quantity: z.number().int().positive().max(99),
  image: z.string().nullable().optional(),
});

export type CartItemInput = z.infer<typeof cartItemSchema>;

export interface ResolvedCartLine {
  variantId: string;
  quantity: number;
  image: string | null;
}

export async function resolveCartLines(items: readonly CartItemInput[]): Promise<ResolvedCartLine[]> {
  const missing = [...new Set(items.filter((i) => !i.variantId).map((i) => i.productId))];
  const defaults = new Map<string, string>();

  if (missing.length) {
    const products = await catalogService.findProductsWithVariants(missing.map(ProductId));
    for (const product of products) {
      const variant =
        product.variants.find((v) => v.isActive && v.isDefault) ??
        product.variants.find((v) => v.isActive);
      if (variant) defaults.set(product.productId, variant.variantId);
    }
  }

  const merged = new Map<string, ResolvedCartLine>();
  for (const item of items) {
    const variantId = item.variantId ?? defaults.get(item.productId);
    if (!variantId) {
      throw new DomainError("VARIANT_NOT_FOUND", "An item in your cart is no longer available", {
        productId: item.productId,
      });
    }
    const existing = merged.get(variantId);
    if (existing) existing.quantity += item.quantity;
    else merged.set(variantId, { variantId, quantity: item.quantity, image: item.image ?? null });
  }
  return [...merged.values()];
}
