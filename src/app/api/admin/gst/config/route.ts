import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiHandler } from "@/lib/api-handler";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { DomainError } from "@/modules/_shared/errors";
import { engineMode, invalidateGstState } from "@/modules/gst/state";
import { gstActor } from "../_shared";

export const dynamic = "force-dynamic";

const treatment = z.enum(["NONE", "FOLLOWS_GOODS", "SEPARATE"]);
const schema = z.object({
  shippingTreatment: treatment.optional(),
  codTreatment: treatment.optional(),
  mixedBasketPolicy: z.enum(["PROPORTIONAL", "HIGHEST_RATE"]).nullable().optional(),
  treatmentBasis: z.string().max(2000).nullable().optional(),
  /** The accountant who decided how delivery and cash-on-delivery are taxed. */
  approvedBy: z.string().max(120).optional(),
  stateTableReviewedBy: z.string().max(120).optional(),
  placeOfSupplyReviewedBy: z.string().max(120).optional(),
});

// GET /api/admin/gst/config
export const GET = apiHandler(async () => {
  await gstActor("gst:read");
  return NextResponse.json({ config: await prisma.gstConfiguration.findFirst() });
});

// PUT /api/admin/gst/config — how delivery and cash-on-delivery are taxed, and the accountant's reviews
export const PUT = apiHandler(async (req: NextRequest) => {
  const { admin } = await gstActor("gst:approve");
  const input = schema.parse(await req.json());
  const changesTreatment = input.shippingTreatment !== undefined || input.codTreatment !== undefined || input.mixedBasketPolicy !== undefined;
  // What a charge is taxed as changes what customers pay: never under an enforcing engine.
  if (changesTreatment && (await engineMode()) === "ENFORCE") {
    throw new DomainError("CONFLICT", "Turn the GST engine OFF before changing how delivery or cash on delivery is taxed");
  }
  if (changesTreatment && !input.approvedBy?.trim()) throw new DomainError("VALIDATION_FAILED", "Say which accountant decided this");

  const now = new Date();
  const existing = (await prisma.gstConfiguration.findFirst()) ?? (await prisma.gstConfiguration.create({ data: {} }));
  const row = await prisma.gstConfiguration.update({
    where: { id: existing.id },
    data: {
      ...(input.shippingTreatment ? { shippingTreatment: input.shippingTreatment } : {}),
      ...(input.codTreatment ? { codTreatment: input.codTreatment } : {}),
      ...(input.mixedBasketPolicy !== undefined ? { mixedBasketPolicy: input.mixedBasketPolicy } : {}),
      ...(input.treatmentBasis !== undefined ? { treatmentBasis: input.treatmentBasis } : {}),
      ...(changesTreatment ? { treatmentApprovedBy: `${input.approvedBy!.trim()} (entered by ${admin.name ?? admin.id})`, treatmentApprovedAt: now } : {}),
      ...(input.stateTableReviewedBy ? { stateTableReviewedBy: input.stateTableReviewedBy.trim(), stateTableReviewedAt: now } : {}),
      ...(input.placeOfSupplyReviewedBy ? { placeOfSupplyReviewedBy: input.placeOfSupplyReviewedBy.trim(), placeOfSupplyReviewedAt: now } : {}),
      updatedBy: admin.id,
    },
  });
  invalidateGstState();
  await createAuditLog({ adminId: admin.id, adminName: admin.name ?? undefined, action: "GST_CONFIG_SAVED", entity: "GstConfiguration", entityId: row.id, metadata: input as never });
  return NextResponse.json({ config: row });
});
