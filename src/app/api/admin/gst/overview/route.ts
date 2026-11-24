import { NextResponse } from "next/server";
import { apiHandler } from "@/lib/api-handler";
import { prisma } from "@/lib/prisma";
import { activationChecks } from "@/modules/gst/activation";
import { worklist } from "@/modules/gst/classification";
import { invalidateGstState, gstState } from "@/modules/gst/state";
import { gstActor } from "../_shared";

export const dynamic = "force-dynamic";

// GET /api/admin/gst/overview — everything the GST dashboard shows, in one call
export const GET = apiHandler(async () => {
  await gstActor("gst:read");
  invalidateGstState();
  const { profile, config } = await gstState();
  const since = new Date(Date.now() - 30 * 86_400_000);

  const [shadow, rows, rates, unverified, pending, enforcedAudits, withDetail, mismatches, checksShadow, checksEnforce] = await Promise.all([
    prisma.gstCalculationAudit.groupBy({ by: ["mode", "outcome"], where: { calculatedAt: { gte: since } }, _count: true }),
    worklist(),
    prisma.gstRateMaster.groupBy({ by: ["approval"], _count: true }),
    prisma.gstNotification.count({ where: { verifiedBy: null } }),
    prisma.gstPendingCatalogItem.count({ where: { status: "PENDING_IMPORT" } }),
    prisma.gstCalculationAudit.count({ where: { mode: "ENFORCE", orderId: { not: null }, outcome: { in: ["MATCHED", "DIFFERS"] } } }),
    prisma.gstInvoiceDetail.count(),
    prisma.$queryRaw<Array<{ n: number }>>`SELECT count(*)::int AS n FROM gst_invoice_details d JOIN invoices i ON i."orderId" = d."orderId" WHERE d."invoiceValueCents" <> i."totalCents"`,
    activationChecks("SHADOW"),
    activationChecks("ENFORCE"),
  ]);

  const count = (status: string) => rows.filter((r) => (r.mapping?.status ?? "NONE") === status).length;
  return NextResponse.json({
    mode: profile?.engineMode ?? "OFF",
    profile: profile && { legalName: profile.legalName, gstin: profile.gstin, stateCode: profile.stateCode, stateName: profile.stateName, verificationStatus: profile.verificationStatus, verifiedBy: profile.verifiedBy, engineModeChangedAt: profile.engineModeChangedAt, enforceApprovedBy: profile.enforceApprovedBy },
    config: config && { shippingTreatment: config.shippingTreatment, codTreatment: config.codTreatment, mixedBasketPolicy: config.mixedBasketPolicy, treatmentApprovedBy: config.treatmentApprovedBy },
    products: {
      total: rows.length,
      info: { MISSING: rows.filter((r) => r.infoStatus === "MISSING").length, PARTIAL: rows.filter((r) => r.infoStatus === "PARTIAL").length, COMPLETE: rows.filter((r) => r.infoStatus === "COMPLETE").length },
      verified: count("VERIFIED"),
      awaitingApproval: count("NEEDS_ACCOUNTANT_APPROVAL"),
      needInformation: rows.length - count("VERIFIED") - count("NEEDS_ACCOUNTANT_APPROVAL"),
    },
    shadow: shadow.map((s) => ({ mode: s.mode, outcome: s.outcome, count: s._count })),
    rates: Object.fromEntries(rates.map((r) => [r.approval, r._count])),
    unverifiedNotifications: unverified,
    pendingCatalogItems: pending,
    invoices: { enforcedOrders: enforcedAudits, withGstDetail: withDetail, valueMismatches: mismatches[0]?.n ?? 0 },
    checks: { SHADOW: checksShadow, ENFORCE: checksEnforce },
  });
});
