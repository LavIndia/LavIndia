/**
 * Batches of unique codes for an offer: list, generate, remove the unused.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiHandler } from "@/lib/api-handler";
import { requireAdmin } from "@/lib/require-admin";
import { createAuditLog } from "@/lib/audit";
import { revalidatePromotions } from "@/lib/promotions-cache";
import { generateCodes, listCodeBatches, removeUnusedBatchCodes } from "@/modules/promotions";

type Params = { params: Promise<{ id: string }> };

const generateSchema = z.object({
  count: z.number().int().min(1).max(1000),
  prefix: z.string().trim().max(12).optional(),
  usesEach: z.number().int().min(1).nullable().default(1),
});

export function GET(_req: NextRequest, { params }: Params) {
  return apiHandler(async () => {
    await requireAdmin("catalog:write");
    const { id } = await params;
    return NextResponse.json({ batches: await listCodeBatches(id) });
  })();
}

export function POST(req: NextRequest, { params }: Params) {
  return apiHandler(async () => {
    const actor = await requireAdmin("catalog:write");
    const { id } = await params;
    const input = generateSchema.parse(await req.json());
    const batch = await generateCodes(id, input);
    await createAuditLog({
      adminId: actor.id,
      adminName: actor.name ?? undefined,
      action: "GENERATE_CODES",
      entity: "Promotion",
      entityId: id,
      metadata: { count: input.count, batch },
    });
    revalidatePromotions();
    return NextResponse.json({ batch, batches: await listCodeBatches(id) });
  })();
}

export function DELETE(req: NextRequest, { params }: Params) {
  return apiHandler(async () => {
    await requireAdmin("catalog:write");
    const { id } = await params;
    const batch = req.nextUrl.searchParams.get("batch") ?? "";
    const removed = await removeUnusedBatchCodes(id, batch);
    revalidatePromotions();
    return NextResponse.json({ removed, batches: await listCodeBatches(id) });
  })();
}
