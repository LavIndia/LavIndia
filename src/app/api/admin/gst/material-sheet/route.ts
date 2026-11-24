import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiHandler } from "@/lib/api-handler";
import { buildTemplate, importSheet } from "@/modules/gst/material-csv";
import { gstActor } from "../_shared";

export const dynamic = "force-dynamic";

const body = z.object({ csv: z.string().min(1).max(2_000_000), dryRun: z.boolean().default(true) });

// GET /api/admin/gst/material-sheet — the sheet to fill in, one row per product
export const GET = apiHandler(async () => {
  await gstActor("gst:read");
  return new NextResponse(await buildTemplate(), {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": 'attachment; filename="lavindia-gst-product-material.csv"', "cache-control": "no-store" },
  });
});

// POST /api/admin/gst/material-sheet — read a filled-in sheet; a dry run shows what would be saved
export const POST = apiHandler(async (req: NextRequest) => {
  const { actor } = await gstActor("gst:write");
  const input = body.parse(await req.json());
  return NextResponse.json(await importSheet(input.csv, actor, input.dryRun));
});
