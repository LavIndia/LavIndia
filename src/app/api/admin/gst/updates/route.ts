import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiHandler } from "@/lib/api-handler";
import { prisma } from "@/lib/prisma";
import { acknowledgeWatchChange, addWatch, checkWatch, OFFICIAL_HOSTS, proposeChange, reviewProposal } from "@/modules/gst/monitoring";
import { gstActor } from "../_shared";

export const dynamic = "force-dynamic";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const action = z.discriminatedUnion("action", [
  z.object({ action: z.literal("propose"), title: z.string().min(1).max(300), notificationId: z.string().nullable().optional(), sourceUrl: z.string().max(1000).nullable().optional(), noticeDate: date.nullable().optional(), effectiveFrom: date.nullable().optional(), summary: z.string().max(2000).nullable().optional(), change: z.object({ code: z.string().min(2).max(8), codeKind: z.enum(["HSN", "SAC"]), description: z.string().min(1).max(500), rateBps: z.number().int().min(0).max(10000), cessBps: z.number().int().min(0).optional(), minUnitValueCents: z.number().int().min(0).nullable().optional(), maxUnitValueCents: z.number().int().min(0).nullable().optional() }) }),
  z.object({ action: z.literal("review"), id: z.string().min(1), decision: z.enum(["IN_REVIEW", "ACCEPT", "REJECT"]), reviewer: z.string().max(120).default(""), note: z.string().max(1000).nullable().optional() }),
  z.object({ action: z.literal("addWatch"), label: z.string().min(1).max(200), url: z.string().max(1000) }),
  z.object({ action: z.literal("checkWatch"), id: z.string().min(1) }),
  z.object({ action: z.literal("acknowledge"), id: z.string().min(1) }),
]);

// GET /api/admin/gst/updates — proposed changes and watched official pages
export const GET = apiHandler(async () => {
  await gstActor("gst:read");
  const [proposals, watches] = await Promise.all([
    prisma.gstRateProposal.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { notification: { select: { number: true } } } }),
    prisma.gstSourceWatch.findMany({ orderBy: { createdAt: "desc" } }),
  ]);
  return NextResponse.json({ proposals, watches, officialHosts: OFFICIAL_HOSTS });
});

// POST /api/admin/gst/updates — propose, review, watch, check. Accepting a proposal only ever creates a DRAFT rate.
export const POST = apiHandler(async (req: NextRequest) => {
  await gstActor("gst:read"); // sign-in comes before the body is read; the action then asks for what it needs
  const body = action.parse(await req.json());
  if (body.action === "review" && body.decision !== "IN_REVIEW") {
    const { actor } = await gstActor("gst:approve");
    return NextResponse.json(await reviewProposal(body.id, body.decision, body.reviewer, body.note ?? null, actor));
  }
  const { actor } = await gstActor("gst:write");
  switch (body.action) {
    case "propose": return NextResponse.json(await proposeChange(body, actor), { status: 201 });
    case "review": return NextResponse.json(await reviewProposal(body.id, "IN_REVIEW", "", null, actor));
    case "addWatch": return NextResponse.json(await addWatch(body.label, body.url, actor), { status: 201 });
    case "checkWatch": return NextResponse.json(await checkWatch(body.id));
    case "acknowledge": return NextResponse.json(await acknowledgeWatchChange(body.id, actor));
  }
});
