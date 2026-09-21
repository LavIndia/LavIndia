/**
 * Correct or write off stock.
 *
 * A reason is required by the schema as well as by the service: stock never
 * changes in this system without a stated cause that survives in the ledger.
 */
import { NextRequest, NextResponse } from "next/server";
import { revalidateStockViews } from "@/lib/catalog-cache";
import { z } from "zod";
import { apiHandler } from "@/lib/api-handler";
import { requireAdmin } from "@/lib/require-admin";
import { createAuditLog } from "@/lib/audit";
import { inventoryService } from "@/modules/inventory";
import { LocationId, VariantId } from "@/modules/_shared/ids";

const adjustSchema = z.object({
  lines: z
    .array(
      z.object({
        variantId: z.string().min(1),
        quantity: z.number().int().positive(),
      }),
    )
    .min(1, "Add at least one item"),
  type: z.enum(["ADJUSTMENT_IN", "ADJUSTMENT_OUT", "DAMAGE"]),
  reason: z.string().trim().min(1, "A reason is required").max(500),
  locationId: z.string().min(1).optional(),
  idempotencyKey: z.string().min(8).max(200).optional(),
});

export const POST = apiHandler(async (req: NextRequest) => {
  const actor = await requireAdmin("inventory:write");
  const input = adjustSchema.parse(await req.json());

  const movements = await inventoryService.adjust(
    input.lines.map((line) => ({
      variantId: VariantId(line.variantId),
      quantity: line.quantity,
    })),
    input.type,
    {
      locationId: input.locationId ? LocationId(input.locationId) : undefined,
      reason: input.reason,
      actorId: actor.id,
      idempotencyKey: input.idempotencyKey,
    },
  );

  await createAuditLog({
    adminId: actor.id,
    adminName: actor.name ?? undefined,
    action: input.type,
    entity: "Inventory",
    metadata: {
      reason: input.reason,
      lines: movements.map((m) => ({
        variantId: m.variantId,
        quantity: m.quantity,
        before: m.beforeQuantity,
        after: m.afterQuantity,
      })),
    },
  });

  revalidateStockViews();
  return NextResponse.json({ success: true, movements });
});
