import { NextRequest, NextResponse } from "next/server";
import { apiHandler } from "@/lib/api-handler";
import { prisma } from "@/lib/prisma";
import { gstActor } from "../_shared";

export const dynamic = "force-dynamic";

const OUTCOMES = ["MATCHED", "DIFFERS", "MISSING_MAPPING", "ERROR"] as const;

// GET /api/admin/gst/monitor?outcome=DIFFERS&mode=SHADOW — recent calculations and how they compare with the existing engine
export const GET = apiHandler(async (req: NextRequest) => {
  await gstActor("gst:read");
  const params = req.nextUrl.searchParams;
  const outcome = OUTCOMES.find((o) => o === params.get("outcome"));
  const mode = params.get("mode") === "ENFORCE" ? "ENFORCE" : params.get("mode") === "SHADOW" ? "SHADOW" : undefined;
  const since = new Date(Date.now() - 30 * 86_400_000);

  const [rows, byOutcome, sums] = await Promise.all([
    prisma.gstCalculationAudit.findMany({
      where: { ...(outcome ? { outcome } : {}), ...(mode ? { mode } : {}) },
      orderBy: { calculatedAt: "desc" },
      take: 100,
      select: { id: true, orderId: true, orderNumber: true, mode: true, channel: true, calculatedAt: true, outcome: true, supplyType: true, placeOfSupplyCode: true, totalTaxCents: true, legacyTaxCents: true, differenceCents: true, missingMappings: true, errorMessage: true, rateVersionIds: true },
    }),
    prisma.gstCalculationAudit.groupBy({ by: ["outcome"], where: { calculatedAt: { gte: since } }, _count: true }),
    prisma.gstCalculationAudit.aggregate({ where: { calculatedAt: { gte: since }, outcome: { in: ["MATCHED", "DIFFERS"] } }, _sum: { totalTaxCents: true, legacyTaxCents: true, differenceCents: true } }),
  ]);
  return NextResponse.json({
    rows,
    last30Days: Object.fromEntries(byOutcome.map((b) => [b.outcome, b._count])),
    taxFromEngineCents: sums._sum.totalTaxCents ?? 0,
    taxFromExistingEngineCents: sums._sum.legacyTaxCents ?? 0,
    netDifferenceCents: sums._sum.differenceCents ?? 0,
  });
});
