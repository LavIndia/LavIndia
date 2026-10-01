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
import { createProductInTx } from "@/modules/catalog";
import { inventoryService } from "@/modules/inventory";
import { VariantId, type LocationId } from "@/modules/_shared/ids";

/** The ledger reason on the movement that brings an uploaded piece's count in. */
export const OPENING_STOCK_REASON = "Opening stock — bulk upload";

export async function importProductRow(
  row: Prisma.ProductUncheckedCreateInput & { stock: number },
  context: { actorId?: string; locationId: LocationId },
): Promise<{ productId: string }> {
  return prisma.$transaction(
    async (tx) => {
      const { id } = await createProductInTx(tx, { product: row });
      if (row.stock > 0) {
        const variant = await tx.productVariant.findFirstOrThrow({
          where: { productId: id },
          select: { id: true },
        });
        await inventoryService.adjust(
          [{ variantId: VariantId(variant.id), quantity: row.stock }],
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
