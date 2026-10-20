/**
 * One row of the CSV bulk upload, made into a product that can be sold.
 *
 * The product goes through the same creation path as the admin product form
 * (`createProductInTx`), so it leaves with its Default variant, SKU and
 * barcode. The uploaded count then comes in as an opening-stock adjustment
 * through the Inventory service — a ledger entry, never a bare number on a
 * column nothing reads. Product, variant and stock commit together or not at
 * all.
 */
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createProductInTx, slugify } from "@/modules/catalog";
import type { NewImageInput, NewVariantInput } from "@/modules/catalog/products/create-product";
import { inventoryService } from "@/modules/inventory";
import { VariantId, type LocationId } from "@/modules/_shared/ids";

/** The ledger reason on the movement that brings an uploaded piece's count in. */
export const OPENING_STOCK_REASON = "Opening stock — bulk upload";

export async function importProductRow(
  row: Omit<Prisma.ProductUncheckedCreateInput, "categoryId"> & {
    categoryName: string;
    stock: number;
    variants?: readonly NewVariantInput[];
    images?: readonly NewImageInput[];
  },
  context: { actorId?: string; locationId: LocationId },
): Promise<{ productId: string }> {
  return prisma.$transaction(
    async (tx) => {
      const { stock, variants, images, categoryName, ...product } = row;
      const normalizedCategoryName = categoryName.trim();
      let category = await tx.category.findFirst({
        where: { name: { equals: normalizedCategoryName, mode: "insensitive" } },
        select: { id: true },
      });

      if (!category) {
        const baseSlug = slugify(normalizedCategoryName) || "category";
        let categorySlug = baseSlug;
        let suffix = 2;
        while (await tx.category.findUnique({ where: { slug: categorySlug }, select: { id: true } })) {
          categorySlug = `${baseSlug}-${suffix++}`;
        }

        category = await tx.category.create({
          data: { name: normalizedCategoryName, slug: categorySlug },
          select: { id: true },
        });

        if (context.actorId) {
          await tx.auditLog.create({
            data: {
              adminId: context.actorId,
              action: "CREATE",
              entity: "Category",
              entityId: category.id,
              metadata: { categoryName: normalizedCategoryName, source: "bulk-product-upload" },
            },
          });
        }
      }

      const { id } = await createProductInTx(tx, {
        product: { ...product, categoryId: category.id },
        variants,
        images,
      });

      const createdVariants = await tx.productVariant.findMany({
          where: { productId: id },
          orderBy: { position: "asc" },
          select: { id: true, isDefault: true },
        });

      const openingStock = variants?.length
        ? createdVariants.map((variant, index) => ({
            variantId: VariantId(variant.id),
            quantity: variants[index]?.stock ?? 0,
          }))
        : createdVariants
            .filter((variant) => variant.isDefault)
            .map((variant) => ({
              variantId: VariantId(variant.id),
              quantity: stock,
            }));

      const positiveOpeningStock = openingStock.filter((entry) => entry.quantity > 0);
      if (positiveOpeningStock.length > 0) {
        await inventoryService.adjust(
          positiveOpeningStock,
          "ADJUSTMENT_IN",
          { reason: OPENING_STOCK_REASON, actorId: context.actorId, locationId: context.locationId },
          tx,
        );
      }
      return { productId: id };
    },
    { timeout: 20_000, maxWait: 10_000 },
  );
}
