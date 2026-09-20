import type { Tx } from "../../_shared/db";
import { allocateIdentifiers } from "./identifiers";

/**
 * The two invariants every product must satisfy after any save, applied
 * inside the caller's transaction so a product can never be observed
 * breaking them.
 *
 *   1. A product has at least one variant. One without options carries a
 *      single implicit variant named "Default", so Inventory, POS and
 *      Billing only ever deal in variants and never special-case a bare
 *      product.
 *   2. Every variant has a SKU and a barcode. Both are allocated here, from
 *      the shared sequence, never typed by hand.
 *
 * The admin product routes create and delete variants freely and then call
 * these two functions last. That keeps the rules in one place — here — rather
 * than re-implemented in each route.
 */

export const DEFAULT_VARIANT_NAME = "Default";

/** Creates the implicit single variant when a product has none. Idempotent. */
export async function ensureDefaultVariant(tx: Tx, productId: string): Promise<void> {
  const count = await tx.productVariant.count({ where: { productId } });
  if (count > 0) return;

  await tx.productVariant.create({
    data: { productId, name: DEFAULT_VARIANT_NAME, isDefault: true },
  });
}

/**
 * Allocates SKU and barcode for any of the product's variants still missing
 * one. One sequence round trip for the whole batch, however many were just
 * created. Idempotent: a variant that already has both is left alone.
 */
export async function allocateMissingIdentifiers(tx: Tx, productId: string): Promise<void> {
  const missing = await tx.productVariant.findMany({
    where: { productId, OR: [{ sku: null }, { barcode: null }] },
    select: { id: true, sku: true, barcode: true, product: { select: { slug: true } } },
  });
  if (missing.length === 0) return;

  const allocated = await allocateIdentifiers(
    tx,
    missing.map((v) => ({
      productSlug: v.product.slug,
      needsSku: !v.sku,
      needsBarcode: !v.barcode,
    })),
  );

  await Promise.all(
    missing.map((v, i) =>
      tx.productVariant.update({
        where: { id: v.id },
        data: {
          ...(allocated[i].sku ? { sku: allocated[i].sku } : {}),
          ...(allocated[i].barcode ? { barcode: allocated[i].barcode } : {}),
        },
      }),
    ),
  );
}

/**
 * Keeps the `isDefault` flag true of the world rather than of whatever the
 * client last believed.
 *
 * A variant is the implicit Default only while it is the product's one
 * variant and carries no option values. So the moment a single-item product
 * gains options — its Default variant promoted into "Gold", say — the flag
 * clears itself, and it sets itself again if the product is ever reduced
 * back to one option-less variant.
 */
export async function normaliseDefaultFlags(tx: Tx, productId: string): Promise<void> {
  const variants = await tx.productVariant.findMany({
    where: { productId },
    select: { id: true, color: true, size: true, material: true, isDefault: true },
  });

  await Promise.all(
    variants.map((v) => {
      const hasOptions = Boolean(v.color || v.size || v.material);
      const shouldBeDefault = variants.length === 1 && !hasOptions;
      return v.isDefault === shouldBeDefault
        ? null
        : tx.productVariant.update({
            where: { id: v.id },
            data: { isDefault: shouldBeDefault },
          });
    }),
  );
}

/** Runs every invariant, in the order they depend on each other. */
export async function enforceVariantInvariants(tx: Tx, productId: string): Promise<void> {
  await ensureDefaultVariant(tx, productId);
  await normaliseDefaultFlags(tx, productId);
  await allocateMissingIdentifiers(tx, productId);
}
