import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiHandler } from "@/lib/api-handler";
import { prisma } from "@/lib/prisma";
import { gstActor } from "../_shared";

export const dynamic = "force-dynamic";

const body = z.object({ id: z.string().min(1), status: z.enum(["PENDING_IMPORT", "IMPORTED", "DROPPED"]), matchedProductId: z.string().nullable().optional() });

// GET /api/admin/gst/pending — products and categories on the live shop that are not in this catalog yet
export const GET = apiHandler(async () => {
  await gstActor("gst:read");
  return NextResponse.json({ items: await prisma.gstPendingCatalogItem.findMany({ orderBy: [{ kind: "asc" }, { name: "asc" }] }) });
});

// PATCH /api/admin/gst/pending — mark one imported (naming the product it became) or dropped
export const PATCH = apiHandler(async (req: NextRequest) => {
  await gstActor("gst:write");
  const input = body.parse(await req.json());
  if (input.status === "IMPORTED") {
    const found = input.matchedProductId ? await prisma.product.findUnique({ where: { id: input.matchedProductId }, select: { id: true } }) : null;
    if (!found) return NextResponse.json({ error: "Name the product it became" }, { status: 400 });
  }
  const row = await prisma.gstPendingCatalogItem.update({ where: { id: input.id }, data: { status: input.status, matchedProductId: input.status === "IMPORTED" ? input.matchedProductId : null } });
  return NextResponse.json({ item: row });
});
