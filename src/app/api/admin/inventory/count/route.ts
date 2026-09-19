/**
 * Corrects one variant's stock to an actual counted figure.
 *
 * The operator types what is really on the shelf — not a delta — because
 * that is what they can see. The difference is worked out here and recorded
 * as a proper adjustment, so the ledger stays complete without anyone having
 * to think in plus and minus.
 *
 * Direction decides the movement type: counting up is ADJUSTMENT_IN, counting
 * down is ADJUSTMENT_OUT, unless the reason given is damage, which is its own
 * type so write-offs can be totalled separately at year end.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiHandler } from "@/lib/api-handler";
import { requireAdmin } from "@/lib/require-admin";
import { createAuditLog } from "@/lib/audit";
import { inventoryService } from "@/modules/inventory";
import { LocationId, VariantId } from "@/modules/_shared/ids";
import { COUNT_REASONS, reasonToMovementType, type CountReasonCode } from "@/modules/inventory/count-reasons";

const schema = z.object({
  variantId: z.string().min(1),
  /** What is actually on the shelf, counted. */
  countedQuantity: z.number().int().min(0),
  reasonCode: z.enum(COUNT_REASONS.map((r) => r.code) as [CountReasonCode, ...CountReasonCode[]]),
  /** Optional extra detail, only when the operator wants to add it. */
  note: z.string().trim().max(500).optional(),
  locationId: z.string().min(1).optional(),
  idempotencyKey: z.string().min(8).max(200).optional(),
});

export const POST = apiHandler(async (req: NextRequest) => {
  const actor = await requireAdmin("inventory:write");
  const input = schema.parse(await req.json());

  const variantId = VariantId(input.variantId);
  const locationId = input.locationId ? LocationId(input.locationId) : undefined;

  const levels = await inventoryService.getLevels([variantId], locationId ? { locationId } : undefined);
  const level = levels.get(variantId);
  const current = level?.quantity ?? 0;
  const delta = input.countedQuantity - current;

  if (delta === 0) {
    return NextResponse.json({ success: true, quantity: current, unchanged: true });
  }

  const reason = COUNT_REASONS.find((r) => r.code === input.reasonCode)!;
  const type = reasonToMovementType(input.reasonCode, delta);
  const reasonText = input.note ? `${reason.label} — ${input.note}` : reason.label;

  const movements = await inventoryService.adjust(
    [{ variantId, quantity: Math.abs(delta) }],
    type,
    { locationId, reason: reasonText, actorId: actor.id, idempotencyKey: input.idempotencyKey },
  );

  await createAuditLog({
    adminId: actor.id,
    adminName: actor.name ?? undefined,
    action: type,
    entity: "Inventory",
    entityId: input.variantId,
    metadata: { from: current, to: input.countedQuantity, reason: reasonText },
  });

  return NextResponse.json({
    success: true,
    quantity: movements[0]?.afterQuantity ?? input.countedQuantity,
  });
});
