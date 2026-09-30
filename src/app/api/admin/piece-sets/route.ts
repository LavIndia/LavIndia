/** Piece Sets: list (with the offers using each) and create. */
import { NextRequest, NextResponse } from "next/server";
import { apiHandler } from "@/lib/api-handler";
import { requireAdmin } from "@/lib/require-admin";
import { createAuditLog } from "@/lib/audit";
import { revalidatePromotions } from "@/lib/promotions-cache";
import { createPieceSet, loadSetLibrarySource, setUsage } from "@/modules/promotions";

export const GET = apiHandler(async () => {
  await requireAdmin("catalog:write");
  const [source, usage] = await Promise.all([loadSetLibrarySource(), setUsage()]);
  return NextResponse.json({
    sets: source.stored.map((s) => ({ ...s, usedBy: usage.get(s.id) ?? [] })),
  });
});

export const POST = apiHandler(async (req: NextRequest) => {
  const actor = await requireAdmin("catalog:write");
  const set = await createPieceSet(await req.json());
  await createAuditLog({
    adminId: actor.id,
    adminName: actor.name ?? undefined,
    action: "CREATE",
    entity: "PieceSet",
    entityId: set.id,
    metadata: { name: set.name },
  });
  revalidatePromotions();
  return NextResponse.json({ set });
});
