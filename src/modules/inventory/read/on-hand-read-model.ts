import { prisma } from "@/modules/_shared/db";

/**
 * What a variant physically holds, summed across locations.
 *
 * Distinct from availability: availability subtracts reservations because it
 * answers "can this be sold right now". This answers "is there anything here
 * at all", which is the question to ask before a variant is deleted — a
 * reserved unit is still a unit on a shelf, and deleting its variant would
 * cascade the row away and lose it.
 */
export interface OnHand {
  quantity: number;
  reserved: number;
}

export async function onHandByVariant(
  variantIds: readonly string[],
): Promise<Map<string, OnHand>> {
  const result = new Map<string, OnHand>();
  if (variantIds.length === 0) return result;

  const levels = await prisma.inventoryLevel.groupBy({
    by: ["variantId"],
    where: { variantId: { in: [...variantIds] } },
    _sum: { quantity: true, reservedQuantity: true },
  });

  for (const level of levels) {
    result.set(level.variantId, {
      quantity: level._sum.quantity ?? 0,
      reserved: level._sum.reservedQuantity ?? 0,
    });
  }
  return result;
}
