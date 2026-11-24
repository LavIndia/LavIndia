import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiHandler } from "@/lib/api-handler";
import { prisma } from "@/lib/prisma";
import { DomainError } from "@/modules/_shared/errors";
import { gstr1, gstr3bFigures, hsnSummary, invoiceDetailMismatches, reconcileGstr3b, salesRegister, tableToCsv, taxLiability } from "@/modules/gst/reports";
import { gstActor } from "../_shared";

export const dynamic = "force-dynamic";

const TYPES = ["sales-register", "gstr1", "hsn", "liability", "gstr3b"] as const;

const reconcile = z.object({
  period: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  note: z.string().max(500).nullable().optional(),
  /** Figures read off the return, in paise. */
  entered: z.object({ taxableCents: z.number().int(), cgstCents: z.number().int(), sgstCents: z.number().int(), igstCents: z.number().int(), cessCents: z.number().int() }),
});

// GET /api/admin/gst/reports?type=gstr1&period=2026-10[&format=csv&table=b2b]
export const GET = apiHandler(async (req: NextRequest) => {
  await gstActor("gst:read");
  const params = req.nextUrl.searchParams;
  const type = TYPES.find((t) => t === params.get("type"));
  const period = params.get("period") ?? "";
  if (!type) throw new DomainError("VALIDATION_FAILED", `type must be one of ${TYPES.join(", ")}`);

  const [data, mismatches, history] = await Promise.all([
    type === "sales-register" ? salesRegister(period) : type === "gstr1" ? gstr1(period) : type === "hsn" ? hsnSummary(period) : type === "liability" ? taxLiability(period) : gstr3bFigures(period),
    invoiceDetailMismatches(period),
    type === "gstr3b" ? prisma.gstReturnReconciliation.findMany({ where: { period, returnType: "GSTR3B" }, orderBy: { createdAt: "desc" }, take: 10 }) : Promise.resolve([]),
  ]);

  if (params.get("format") === "csv") {
    const table = params.get("table") ?? "";
    const rows = (type === "sales-register" ? (data as Awaited<ReturnType<typeof salesRegister>>).rows
      : type === "hsn" ? (data as Awaited<ReturnType<typeof hsnSummary>>)
      : type === "gstr1" ? ((data as unknown as Record<string, unknown>)[table] as Array<Record<string, unknown>> | undefined)
      : undefined);
    if (!rows) throw new DomainError("VALIDATION_FAILED", type === "gstr1" ? "Choose a table: b2b, b2cs, b2cInterState, cdnr, cdnur or hsn" : "That report has no table to export");
    return new NextResponse(tableToCsv(rows as Array<Record<string, unknown>>), { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="gst-${type}${table ? `-${table}` : ""}-${period}.csv"`, "cache-control": "no-store" } });
  }
  return NextResponse.json({ type, period, data, mismatches, history, notice: "Prepared figures for whoever files the return. Nothing here files or submits a return." });
});

// POST /api/admin/gst/reports — set the shop's figures against what was entered on a GSTR-3B (saved; nothing is filed)
export const POST = apiHandler(async (req: NextRequest) => {
  const { admin } = await gstActor("gst:write");
  const input = reconcile.parse(await req.json());
  const row = await reconcileGstr3b(input.period, { entered: input.entered, note: input.note }, admin.id);
  return NextResponse.json({ reconciliation: row }, { status: 201 });
});
