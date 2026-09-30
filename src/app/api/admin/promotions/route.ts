/**
 * Offers: list and create. Every change drops the cached live offers, so the
 * shop prices against the new version at once.
 */
import { NextRequest, NextResponse } from "next/server";
import { apiHandler } from "@/lib/api-handler";
import { requireAdmin } from "@/lib/require-admin";
import { createAuditLog } from "@/lib/audit";
import { revalidatePromotions } from "@/lib/promotions-cache";
import { createPromotion, listPromotions, statusOf } from "@/modules/promotions";

export const GET = apiHandler(async () => {
  await requireAdmin("catalog:write");
  const rows = await listPromotions();
  return NextResponse.json({ promotions: rows.map((row) => ({ ...row, status: statusOf(row) })) });
});

export const POST = apiHandler(async (req: NextRequest) => {
  const actor = await requireAdmin("catalog:write");
  const row = await createPromotion(await req.json(), actor.id);
  await createAuditLog({
    adminId: actor.id,
    adminName: actor.name ?? undefined,
    action: "CREATE",
    entity: "Promotion",
    entityId: row.id,
    metadata: { name: row.name },
  });
  revalidatePromotions();
  return NextResponse.json({ promotion: row });
});
