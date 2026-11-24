import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiHandler } from "@/lib/api-handler";
import { prisma } from "@/lib/prisma";
import { approveRate, createDraftRate, createNotification, saveCode, verifyNotification } from "@/modules/gst/rates-admin";
import { gstActor } from "../_shared";

export const dynamic = "force-dynamic";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const action = z.discriminatedUnion("action", [
  z.object({ action: z.literal("code"), kind: z.enum(["HSN", "SAC"]), code: z.string().min(2).max(8), description: z.string().min(1).max(1000) }),
  z.object({ action: z.literal("notification"), number: z.string().min(1).max(200), issuedOn: date.nullable().optional(), effectiveFrom: date.nullable().optional(), title: z.string().max(500).nullable().optional(), sourceUrl: z.string().max(1000).nullable().optional(), notes: z.string().max(4000).nullable().optional() }),
  z.object({ action: z.literal("verifyNotification"), id: z.string().min(1), verifiedBy: z.string().min(1).max(120), notes: z.string().max(4000).nullable().optional() }),
  z.object({ action: z.literal("draftRate"), hsnId: z.string().nullable().optional(), sacId: z.string().nullable().optional(), rateBps: z.number().int(), cessBps: z.number().int().min(0).optional(), effectiveFrom: date, minUnitValueCents: z.number().int().min(0).nullable().optional(), maxUnitValueCents: z.number().int().min(0).nullable().optional(), notificationId: z.string().nullable().optional(), notes: z.string().max(4000).nullable().optional() }),
  z.object({ action: z.literal("approveRate"), id: z.string().min(1), approverName: z.string().min(1).max(120) }),
]);

// GET /api/admin/gst/masters — codes, rate versions and notifications
export const GET = apiHandler(async () => {
  await gstActor("gst:read");
  const [hsn, sac, rates, notifications] = await Promise.all([
    prisma.gstHsnMaster.findMany({ orderBy: { code: "asc" } }),
    prisma.gstSacMaster.findMany({ orderBy: { code: "asc" } }),
    prisma.gstRateMaster.findMany({ include: { hsn: { select: { code: true } }, sac: { select: { code: true } }, notification: { select: { number: true, verifiedBy: true } } }, orderBy: [{ effectiveFrom: "desc" }] }),
    prisma.gstNotification.findMany({ orderBy: { issuedOn: "desc" } }),
  ]);
  return NextResponse.json({
    hsn, sac, notifications,
    rates: rates.map((r) => ({ id: r.id, code: r.hsn?.code ?? r.sac?.code ?? "", codeKind: r.hsnId ? "HSN" : "SAC", rateBps: r.rateBps, cgstBps: r.cgstBps, sgstBps: r.sgstBps, igstBps: r.igstBps, cessBps: r.cessBps, effectiveFrom: r.effectiveFrom, effectiveTo: r.effectiveTo, minUnitValueCents: r.minUnitValueCents, maxUnitValueCents: r.maxUnitValueCents, approval: r.approval, approvedBy: r.approvedBy, used: !!r.firstUsedAt, notification: r.notification, notes: r.notes })),
  });
});

// POST /api/admin/gst/masters — add a code or notification, draft a rate, verify a notification, approve a rate
export const POST = apiHandler(async (req: NextRequest) => {
  await gstActor("gst:read"); // sign-in comes before the body is read; the action then asks for what it needs
  const body = action.parse(await req.json());
  if (body.action === "approveRate" || body.action === "verifyNotification") {
    const { actor } = await gstActor("gst:approve");
    return NextResponse.json(body.action === "approveRate" ? await approveRate(body.id, body.approverName, actor) : await verifyNotification(body.id, body.verifiedBy, actor, body.notes));
  }
  const { actor } = await gstActor("gst:write");
  if (body.action === "code") return NextResponse.json(await saveCode(body.kind, body.code, body.description, actor));
  if (body.action === "notification") return NextResponse.json(await createNotification(body, actor));
  return NextResponse.json(await createDraftRate(body, actor));
});
