import { NextRequest, NextResponse } from "next/server";
import { apiHandler } from "@/lib/api-handler";
import { requireAdmin } from "@/lib/require-admin";
import { createAuditLog } from "@/lib/audit";
import { revalidatePromotions } from "@/lib/promotions-cache";
import { deletePromotion, getPromotion, statusOf, toInput, updatePromotion } from "@/modules/promotions";

type Params = { params: Promise<{ id: string }> };

export function GET(_req: NextRequest, { params }: Params) {
  return apiHandler(async () => {
  await requireAdmin("catalog:write");
  const row = await getPromotion((await params).id);
  return NextResponse.json({ promotion: row, input: toInput(row), status: statusOf(row) });
  })();
}

export function PATCH(req: NextRequest, { params }: Params) {
  return apiHandler(async () => {
  const actor = await requireAdmin("catalog:write");
  const { id } = await params;
  const row = await updatePromotion(id, await req.json());
  await createAuditLog({
    adminId: actor.id,
    adminName: actor.name ?? undefined,
    action: "UPDATE",
    entity: "Promotion",
    entityId: id,
    metadata: { name: row.name },
  });
  revalidatePromotions();
  return NextResponse.json({ promotion: row, status: statusOf(row) });
  })();
}

export function DELETE(_req: NextRequest, { params }: Params) {
  return apiHandler(async () => {
  const actor = await requireAdmin("catalog:write");
  const { id } = await params;
  await deletePromotion(id);
  await createAuditLog({
    adminId: actor.id,
    adminName: actor.name ?? undefined,
    action: "DELETE",
    entity: "Promotion",
    entityId: id,
  });
  revalidatePromotions();
  return NextResponse.json({ success: true });
  })();
}
