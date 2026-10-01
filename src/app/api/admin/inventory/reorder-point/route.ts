/**
 * Sets the available count at or below which one variant is flagged Low
 * stock. A setting, not a stock movement — nothing is written to the ledger,
 * but the change is audited like any other admin edit.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiHandler } from "@/lib/api-handler";
import { requireAdmin } from "@/lib/require-admin";
import { createAuditLog } from "@/lib/audit";
import { MAX_REORDER_POINT, setReorderPoint } from "@/modules/catalog";

const schema = z.object({
  variantId: z.string().min(1),
  reorderPoint: z.number().int().min(0).max(MAX_REORDER_POINT),
});

export const POST = apiHandler(async (req: NextRequest) => {
  const actor = await requireAdmin("inventory:write");
  const input = schema.parse(await req.json());

  const change = await setReorderPoint(input.variantId, input.reorderPoint);

  if (change.from !== change.to) {
    await createAuditLog({
      adminId: actor.id,
      adminName: actor.name ?? undefined,
      action: "UPDATE",
      entity: "ReorderPoint",
      entityId: input.variantId,
      metadata: change,
    });
  }

  // Only the admin stock screen and the insights read this, and both are
  // rendered fresh per request; no storefront cache carries it.
  return NextResponse.json({ success: true, reorderPoint: change.to });
});
