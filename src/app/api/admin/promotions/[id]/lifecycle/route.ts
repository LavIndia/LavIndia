/** Activate, pause, resume, end, archive or restore an offer. */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiHandler } from "@/lib/api-handler";
import { requireAdmin } from "@/lib/require-admin";
import { createAuditLog } from "@/lib/audit";
import { revalidatePromotions } from "@/lib/promotions-cache";
import { changeLifecycle, statusOf } from "@/modules/promotions";

const schema = z.object({
  action: z.enum(["activate", "pause", "resume", "end", "archive", "restore"]),
});

export function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return apiHandler(async () => {
    const actor = await requireAdmin("catalog:write");
    const { id } = await params;
    const { action } = schema.parse(await req.json());
    const row = await changeLifecycle(id, action);
    await createAuditLog({
      adminId: actor.id,
      adminName: actor.name ?? undefined,
      action: `PROMOTION_${action.toUpperCase()}`,
      entity: "Promotion",
      entityId: id,
      metadata: { name: row.name },
    });
    revalidatePromotions();
    return NextResponse.json({ promotion: row, status: statusOf(row) });
  })();
}
