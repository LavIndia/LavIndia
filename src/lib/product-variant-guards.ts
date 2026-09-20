import { onHandByVariant } from "@/modules/inventory";

/**
 * The rule that sits between the catalog and inventory when a variant is
 * about to be deleted.
 *
 * Inventory rows cascade away with their variant, so deleting one that still
 * holds stock would silently lose units that are physically on a shelf.
 * Neither module owns this rule alone — catalog does not know about levels,
 * inventory does not know about deletion — so it lives here, in the
 * application layer that orchestrates both, and the product routes call it
 * before any `deleteMany`.
 */
export class VariantHasStockError extends Error {
  readonly status = 409;

  constructor(readonly details: { name: string; onHand: number }[]) {
    const list = details.map((d) => `"${d.name}" (${d.onHand} on hand)`).join(", ");
    super(
      `Cannot remove ${list}: stock is still recorded against ${
        details.length === 1 ? "it" : "them"
      }. Move or adjust that stock in Inventory first.`,
    );
    this.name = "VariantHasStockError";
  }
}

/** Throws unless every listed variant holds no stock at all. */
export async function assertVariantsHoldNoStock(
  variants: readonly { id: string; name: string }[],
): Promise<void> {
  if (variants.length === 0) return;

  const onHand = await onHandByVariant(variants.map((v) => v.id));
  const blocked = variants
    .map((v) => ({ name: v.name, onHand: onHand.get(v.id)?.quantity ?? 0 }))
    .filter((v) => v.onHand > 0);

  if (blocked.length) throw new VariantHasStockError(blocked);
}
