/**
 * A variant's reorder point: the available count at or below which it is
 * flagged Low stock.
 *
 * Per variant, because "running low" is not one number — three is sensible
 * for an everyday stud and far too late for a piece that sells one a month.
 * A retired piece keeps whatever it had, but is never flagged Low stock: it
 * will not be reordered, so running down is what is meant to happen to it.
 *
 * The browser-safe rules are in `reorder-point-rules.ts`.
 */
import { prisma } from "../../_shared/db";
import { DomainError } from "../../_shared/errors";
import { MAX_REORDER_POINT, isValidReorderPoint } from "./reorder-point-rules";

export async function setReorderPoint(
  variantId: string,
  reorderPoint: number,
): Promise<{ productName: string; variantName: string; from: number; to: number }> {
  if (!isValidReorderPoint(reorderPoint)) {
    throw new DomainError(
      "VALIDATION_FAILED",
      `A reorder point is a whole number from 0 to ${MAX_REORDER_POINT}`,
    );
  }

  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    select: { name: true, reorderPoint: true, product: { select: { name: true } } },
  });
  if (!variant) {
    throw new DomainError("VARIANT_NOT_FOUND", "That piece no longer exists", { variantId });
  }

  if (variant.reorderPoint !== reorderPoint) {
    await prisma.productVariant.update({ where: { id: variantId }, data: { reorderPoint } });
  }

  return {
    productName: variant.product.name,
    variantName: variant.name,
    from: variant.reorderPoint,
    to: reorderPoint,
  };
}
