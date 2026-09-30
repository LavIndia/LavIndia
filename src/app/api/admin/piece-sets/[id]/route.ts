import { NextRequest, NextResponse } from "next/server";
import { apiHandler } from "@/lib/api-handler";
import { requireAdmin } from "@/lib/require-admin";
import { createAuditLog } from "@/lib/audit";
import { revalidatePromotions } from "@/lib/promotions-cache";
import { deletePieceSet, updatePieceSet } from "@/modules/promotions";

type Params = { params: Promise<{ id: string }> };

export function PATCH(req: NextRequest, { params }: Params) {
  return apiHandler(async () => {
    const actor = await requireAdmin("catalog:write");
    const { id } = await params;
    const set = await updatePieceSet(id, await req.json());
    await createAuditLog({
      adminId: actor.id,
      adminName: actor.name ?? undefined,
      action: "UPDATE",
      entity: "PieceSet",
      entityId: id,
      metadata: { name: set.name },
    });
    // Offers using the set price against it from the next cart on.
    revalidatePromotions();
    return NextResponse.json({ set });
  })();
}

export function DELETE(_req: NextRequest, { params }: Params) {
  return apiHandler(async () => {
    const actor = await requireAdmin("catalog:write");
    const { id } = await params;
    await deletePieceSet(id);
    await createAuditLog({
      adminId: actor.id,
      adminName: actor.name ?? undefined,
      action: "DELETE",
      entity: "PieceSet",
      entityId: id,
    });
    revalidatePromotions();
    return NextResponse.json({ success: true });
  })();
}
