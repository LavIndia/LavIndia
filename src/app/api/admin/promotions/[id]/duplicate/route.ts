import { NextRequest, NextResponse } from "next/server";
import { apiHandler } from "@/lib/api-handler";
import { requireAdmin } from "@/lib/require-admin";
import { createAuditLog } from "@/lib/audit";
import { duplicatePromotion } from "@/modules/promotions";

export function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return apiHandler(async () => {
    const actor = await requireAdmin("catalog:write");
    const { id } = await params;
    const row = await duplicatePromotion(id, actor.id);
    await createAuditLog({
      adminId: actor.id,
      adminName: actor.name ?? undefined,
      action: "DUPLICATE",
      entity: "Promotion",
      entityId: row.id,
      metadata: { from: id, name: row.name },
    });
    return NextResponse.json({ promotion: row });
  })();
}
