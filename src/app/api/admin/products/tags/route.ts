/** Add or remove tags on many products at once, from the products list. */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiHandler } from "@/lib/api-handler";
import { requireAdmin } from "@/lib/require-admin";
import { createAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { revalidatePromotions } from "@/lib/promotions-cache";
import { normaliseTags } from "@/modules/catalog";

const schema = z.object({
  productIds: z.array(z.string().min(1)).min(1).max(500),
  add: z.array(z.string()).max(20).default([]),
  remove: z.array(z.string()).max(20).default([]),
});

export const POST = apiHandler(async (req: NextRequest) => {
  const actor = await requireAdmin("catalog:write");
  const input = schema.parse(await req.json());
  const add = normaliseTags(input.add);
  const remove = new Set(normaliseTags(input.remove));

  const products = await prisma.product.findMany({
    where: { id: { in: input.productIds } },
    select: { id: true, tags: true },
  });
  await prisma.$transaction(
    products.map((p) =>
      prisma.product.update({
        where: { id: p.id },
        data: { tags: normaliseTags([...p.tags, ...add]).filter((t) => !remove.has(t)) },
      }),
    ),
  );
  await createAuditLog({
    adminId: actor.id,
    adminName: actor.name ?? undefined,
    action: "BULK_TAG",
    entity: "Product",
    metadata: { count: products.length, add, remove: [...remove] },
  });
  // Tags decide which pieces sit in Piece Sets, and so which offers apply.
  revalidatePromotions();
  return NextResponse.json({ updated: products.length });
});
