/**
 * Applying an edited product's variants and images.
 *
 * Both are the same shape of problem: the client sends the set it wants to
 * end up with, and this works out what to delete, what to insert and what to
 * update. That diff is the fiddly part of saving a product, so it lives here
 * rather than inside the route, which is then only authorise, parse, hand
 * over, respond.
 *
 * Everything here runs inside the caller's transaction. A half-applied diff
 * would leave a product whose photographs belong to variants that no longer
 * exist, so the two either land together or not at all.
 */
import type { Prisma } from "@prisma/client";
import { assertVariantsHoldNoStock } from "@/lib/product-variant-guards";

type Tx = Prisma.TransactionClient;

export interface VariantEdit {
  id?: string;
  name: string;
  color?: string | null;
  size?: string | null;
  material?: string | null;
  priceCents?: number | null;
  stock: number;
}

export interface ImageEdit {
  id?: string;
  url: string;
  alt?: string | null;
  isPrimary: boolean;
  position: number;
  optionDimension?: "color" | "size" | "material" | null;
  optionValue?: string | null;
}

function variantData(variant: VariantEdit) {
  return {
    name: variant.name,
    color: variant.color ?? null,
    size: variant.size ?? null,
    material: variant.material ?? null,
    priceCents: variant.priceCents ?? null,
    stock: variant.stock,
  };
}

function imageData(image: ImageEdit) {
  // A group needs both halves; anything less is a general image.
  const grouped = image.optionDimension && image.optionValue;
  return {
    url: image.url,
    alt: image.alt ?? null,
    isPrimary: image.isPrimary,
    position: image.position,
    optionDimension: grouped ? image.optionDimension : null,
    optionValue: grouped ? image.optionValue : null,
  };
}

/**
 * Brings the product's variants in line with the set supplied.
 *
 * Refuses rather than deletes when a variant on the way out still holds
 * stock: inventory rows cascade with their variant, so removing one would
 * silently lose units that are physically on a shelf.
 */
export async function applyVariantEdits(
  tx: Tx,
  productId: string,
  variants: readonly VariantEdit[],
): Promise<void> {
  const existing = await tx.productVariant.findMany({
    where: { productId },
    select: { id: true, name: true },
  });

  const keepIds = new Set(variants.filter((v) => v.id).map((v) => v.id));
  const toDelete = existing.filter((v) => !keepIds.has(v.id));

  if (toDelete.length) {
    await assertVariantsHoldNoStock(toDelete);
    await tx.productVariant.deleteMany({
      where: { id: { in: toDelete.map((v) => v.id) } },
    });
  }

  // New variants go in as one INSERT; only the pre-existing ones need a
  // statement each, because each carries a different id.
  const fresh = variants.filter((v) => !v.id);
  if (fresh.length) {
    await tx.productVariant.createMany({
      data: fresh.map((v) => ({ ...variantData(v), productId })),
    });
  }

  await Promise.all(
    variants
      .filter((v) => v.id)
      .map((v) => tx.productVariant.update({ where: { id: v.id }, data: variantData(v) })),
  );
}

/**
 * Brings the product's images in line with the set supplied.
 *
 * Returns the URLs of the photographs that were dropped, so the caller can
 * remove them from the media library afterwards — outside the transaction,
 * because that is a network call to another service and must not be able to
 * hold a database transaction open or roll one back.
 */
export async function applyImageEdits(
  tx: Tx,
  productId: string,
  images: readonly ImageEdit[],
): Promise<string[]> {
  const existing = await tx.productImage.findMany({
    where: { productId },
    select: { id: true, url: true },
  });

  const keepIds = new Set(images.filter((img) => img.id).map((img) => img.id));
  const toDelete = existing.filter((img) => !keepIds.has(img.id));
  const fresh = images.filter((img) => !img.id);

  await Promise.all([
    toDelete.length
      ? tx.productImage.deleteMany({ where: { id: { in: toDelete.map((img) => img.id) } } })
      : Promise.resolve(),
    // Newly added photographs are the bulk of a product save, and they all
    // insert together.
    fresh.length
      ? tx.productImage.createMany({
          data: fresh.map((img) => ({ ...imageData(img), productId })),
        })
      : Promise.resolve(),
    ...images
      .filter((img) => img.id)
      .map((img) => tx.productImage.update({ where: { id: img.id }, data: imageData(img) })),
  ]);

  return toDelete.map((img) => img.url);
}
