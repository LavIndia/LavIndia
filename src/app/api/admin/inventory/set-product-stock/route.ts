/**
 * Sets a product's stock to an absolute figure from the Products list.
 *
 * The admin types "12", but inventory does not accept absolute writes — every
 * change has to be a movement with a reason so the ledger stays complete. So
 * this computes the difference against what is actually on hand and issues an
 * adjustment through the Inventory service, which records it properly.
 *
 * A product with more than one sellable option is refused rather than guessed
 * at: "set this product to 12" has no single meaning when it has three sizes,
 * and silently pushing it all onto one option would be wrong in a way nobody
 * would notice until they counted the shelf.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiHandler } from "@/lib/api-handler";
import { requireAdmin } from "@/lib/require-admin";
import { createAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { inventoryService } from "@/modules/inventory";
import { VariantId } from "@/modules/_shared/ids";
import { DomainError } from "@/modules/_shared/errors";

const schema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(0),
  reason: z.string().trim().max(500).optional(),
});

export const POST = apiHandler(async (req: NextRequest) => {
  const actor = await requireAdmin("inventory:write");
  const input = schema.parse(await req.json());

  const product = await prisma.product.findUnique({
    where: { id: input.productId },
    select: {
      name: true,
      variants: { where: { isActive: true }, select: { id: true, name: true } },
    },
  });

  if (!product) {
    throw new DomainError("PRODUCT_NOT_FOUND", "That product no longer exists");
  }
  if (product.variants.length === 0) {
    throw new DomainError("VARIANT_NOT_FOUND", "This product has no sellable option to stock");
  }
  if (product.variants.length > 1) {
    throw new DomainError(
      "VALIDATION_FAILED",
      `${product.name} has ${product.variants.length} options — set stock per option in Inventory › Stock`,
    );
  }

  const variantId = VariantId(product.variants[0].id);
  const levels = await inventoryService.getLevels([variantId]);
  const current = levels.get(variantId)?.available ?? 0;
  const delta = input.quantity - current;

  if (delta === 0) {
    return NextResponse.json({ success: true, quantity: current, unchanged: true });
  }

  const reason = input.reason?.trim() || "Set from the Products list";
  const movements = await inventoryService.adjust(
    [{ variantId, quantity: Math.abs(delta) }],
    delta > 0 ? "ADJUSTMENT_IN" : "ADJUSTMENT_OUT",
    { reason, actorId: actor.id },
  );

  await createAuditLog({
    adminId: actor.id,
    adminName: actor.name ?? undefined,
    action: delta > 0 ? "ADJUSTMENT_IN" : "ADJUSTMENT_OUT",
    entity: "Inventory",
    entityId: input.productId,
    metadata: { productName: product.name, from: current, to: input.quantity, reason },
  });

  return NextResponse.json({
    success: true,
    quantity: movements[0]?.afterQuantity ?? input.quantity,
  });
});
