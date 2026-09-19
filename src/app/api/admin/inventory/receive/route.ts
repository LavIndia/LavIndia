/**
 * Receive stock into a location.
 *
 * The route stays thin: authorise, parse, hand to the Inventory service,
 * record the admin action. All stock rules and atomicity live in the module.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiHandler } from "@/lib/api-handler";
import { requireAdmin } from "@/lib/require-admin";
import { createAuditLog } from "@/lib/audit";
import { inventoryService } from "@/modules/inventory";
import { LocationId, VariantId } from "@/modules/_shared/ids";

const receiveSchema = z.object({
  lines: z
    .array(
      z.object({
        variantId: z.string().min(1),
        quantity: z.number().int().positive(),
      }),
    )
    .min(1, "Add at least one item"),
  locationId: z.string().min(1).optional(),
  reason: z.string().trim().max(500).optional(),
  /** Supplied by the client so a retried submission cannot receive twice. */
  idempotencyKey: z.string().min(8).max(200).optional(),
});

export const POST = apiHandler(async (req: NextRequest) => {
  const actor = await requireAdmin("inventory:write");
  const input = receiveSchema.parse(await req.json());

  const movements = await inventoryService.receive(
    input.lines.map((line) => ({
      variantId: VariantId(line.variantId),
      quantity: line.quantity,
    })),
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
    action: "RECEIVE_STOCK",
    entity: "Inventory",
    metadata: {
      lines: movements.map((m) => ({
        variantId: m.variantId,
        quantity: m.quantity,
        before: m.beforeQuantity,
        after: m.afterQuantity,
      })),
      reason: input.reason ?? null,
    },
  });

  return NextResponse.json({ success: true, movements });
});
