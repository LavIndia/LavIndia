import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiHandler } from "@/lib/api-handler";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { saveBusinessProfile, verifyBusinessProfile } from "@/modules/gst/profile";
import { setEngineMode } from "@/modules/gst/activation";
import { gstActor } from "../_shared";

export const dynamic = "force-dynamic";

const saveSchema = z.object({
  legalName: z.string().max(200).nullable().optional(),
  tradeName: z.string().max(200).nullable().optional(),
  gstin: z.string().max(15).nullable().optional(),
  registeredAddress: z.string().max(500).nullable().optional(),
  registrationType: z.enum(["REGULAR", "COMPOSITION", "UNREGISTERED"]).optional(),
  eInvoicingApplies: z.boolean().nullable().optional(),
});

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("verify"), verifiedBy: z.string().min(1).max(120) }),
  z.object({ action: z.literal("mode"), mode: z.enum(["OFF", "SHADOW", "ENFORCE"]), approvedBy: z.string().max(120).optional() }),
]);

// GET /api/admin/gst/profile
export const GET = apiHandler(async () => {
  await gstActor("gst:read");
  return NextResponse.json({ profile: await prisma.gstBusinessProfile.findFirst() });
});

// PUT /api/admin/gst/profile — enter or correct the registration details
export const PUT = apiHandler(async (req: NextRequest) => {
  const { admin, actor } = await gstActor("gst:write");
  const input = saveSchema.parse(await req.json());
  const profile = await saveBusinessProfile(input, actor.id);
  await createAuditLog({ adminId: admin.id, adminName: admin.name ?? undefined, action: "GST_PROFILE_SAVED", entity: "GstBusinessProfile", entityId: profile.id, metadata: { gstin: profile.gstin, verification: profile.verificationStatus } });
  return NextResponse.json({ profile });
});

// POST /api/admin/gst/profile — verify the registration, or change the engine's mode
export const POST = apiHandler(async (req: NextRequest) => {
  await gstActor("gst:read"); // sign-in comes before the body is read; the action then asks for what it needs
  const body = actionSchema.parse(await req.json());
  if (body.action === "verify") {
    const { admin, actor } = await gstActor("gst:approve");
    const profile = await verifyBusinessProfile(body.verifiedBy, actor.id);
    await createAuditLog({ adminId: admin.id, adminName: admin.name ?? undefined, action: "GST_PROFILE_VERIFIED", entity: "GstBusinessProfile", entityId: profile.id, metadata: { verifiedBy: body.verifiedBy } });
    return NextResponse.json({ profile });
  }
  // Switching OFF is a safety action anyone with write access may take; anything else answers to an approver.
  const { actor } = await gstActor(body.mode === "OFF" ? "gst:write" : "gst:approve");
  const profile = await setEngineMode(body.mode, actor, body.approvedBy);
  return NextResponse.json({ profile });
});
