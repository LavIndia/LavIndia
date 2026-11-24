import { NextResponse } from "next/server";
import { apiHandler } from "@/lib/api-handler";
import { prisma } from "@/lib/prisma";
import { worklist } from "@/modules/gst/classification";
import { gstActor } from "../_shared";

export const dynamic = "force-dynamic";

// GET /api/admin/gst/products — every product with what is missing, suggested and decided
export const GET = apiHandler(async () => {
  await gstActor("gst:read");
  const [rows, pending, hsn] = await Promise.all([
    worklist(),
    prisma.gstPendingCatalogItem.findMany({ orderBy: [{ kind: "asc" }, { name: "asc" }] }),
    prisma.gstHsnMaster.findMany({ select: { id: true, code: true, description: true }, orderBy: { code: "asc" } }),
  ]);
  return NextResponse.json({ products: rows, pending, hsn });
});
