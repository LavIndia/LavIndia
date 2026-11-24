import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiHandler } from "@/lib/api-handler";
import { prisma } from "@/lib/prisma";
import { DomainError } from "@/modules/_shared/errors";
import { approveClassification, rejectClassification, saveComposition, submitClassification } from "@/modules/gst/classification";
import { computeInfoStatus, missingInformation, suggestHeadings, type Composition, type Gem } from "@/modules/gst/composition";
import { gstActor } from "../../_shared";

export const dynamic = "force-dynamic";

const gem = z.object({ name: z.string().min(1).max(80), kind: z.enum(["STONE", "PEARL"]), origin: z.enum(["NATURAL", "CULTURED", "SYNTHETIC", "RECONSTRUCTED", "GLASS", "CUBIC_ZIRCONIA", "OTHER", "UNKNOWN"]), notes: z.string().max(200).optional() });
const composition = z.object({
  baseMetal: z.string().max(120).nullable().optional(),
  alloyNotes: z.string().max(500).nullable().optional(),
  platingType: z.enum(["UNKNOWN", "NONE", "ELECTROPLATED", "PVD", "CLAD_BONDED", "SOLID_PRECIOUS"]).optional(),
  platingMetal: z.string().max(120).nullable().optional(),
  preciousMetal: z.string().max(120).nullable().optional(),
  preciousPurity: z.string().max(60).nullable().optional(),
  preciousWeightMg: z.number().int().min(0).nullable().optional(),
  gems: z.array(gem).max(40).nullable().optional(),
  isHandmade: z.boolean().nullable().optional(),
  handmadeNotes: z.string().max(500).nullable().optional(),
  supplierName: z.string().max(200).nullable().optional(),
  supplierHsn: z.string().regex(/^[0-9]{2,8}$/).nullable().optional(),
  materialNotes: z.string().max(2000).nullable().optional(),
  confirmedBy: z.string().max(120).nullable().optional(),
});

const action = z.discriminatedUnion("action", [
  z.object({ action: z.literal("submit"), hsnId: z.string().min(1), effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), basis: z.string().max(2000).nullable().optional() }),
  z.object({ action: z.literal("approve"), mappingId: z.string().min(1), approverName: z.string().min(1).max(120) }),
  z.object({ action: z.literal("reject"), mappingId: z.string().min(1), approverName: z.string().min(1).max(120), reason: z.string().min(1).max(1000) }),
]);

// GET /api/admin/gst/products/[id] — one product: details, what is missing, suggestions, trail, papers
export const GET = apiHandler(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  await gstActor("gst:read");
  const { id } = await params;
  const product = await prisma.product.findUnique({ where: { id }, select: { id: true, name: true, description: true, priceCents: true, category: { select: { name: true } } } });
  if (!product) throw new DomainError("PRODUCT_NOT_FOUND", "Product not found");
  const [profile, events, mappings, documents] = await Promise.all([
    prisma.gstProductProfile.findUnique({ where: { productId: id } }),
    prisma.gstClassificationEvent.findMany({ where: { productId: id }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.gstProductMapping.findMany({ where: { productId: id, chargeKind: "PRODUCT" }, orderBy: { createdAt: "desc" } }),
    prisma.gstSupplierDocument.findMany({ where: { productIds: { has: id } }, select: { id: true, supplierName: true, invoiceNumber: true, invoiceDate: true, fileName: true, sizeBytes: true, createdAt: true }, orderBy: { createdAt: "desc" } }),
  ]);
  const c: Composition = { baseMetal: profile?.baseMetal ?? null, platingType: profile?.platingType ?? "UNKNOWN", platingMetal: profile?.platingMetal ?? null, preciousMetal: profile?.preciousMetal ?? null, preciousPurity: profile?.preciousPurity ?? null, gems: Array.isArray(profile?.gems) ? (profile!.gems as unknown as Gem[]) : null, confirmedBy: profile?.confirmedBy ?? null };
  return NextResponse.json({ product, profile, infoStatus: computeInfoStatus(c), missing: missingInformation(c), suggestions: suggestHeadings(c), events, mappings, documents });
});

// PUT /api/admin/gst/products/[id] — enter or correct what the piece is made of
export const PUT = apiHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { actor } = await gstActor("gst:write");
  const { id } = await params;
  await saveComposition(id, composition.parse(await req.json()), actor);
  return NextResponse.json({ ok: true });
});

// POST /api/admin/gst/products/[id] — submit for approval, approve, reject
export const POST = apiHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  await gstActor("gst:read"); // sign-in comes before the body is read; the action then asks for what it needs
  const body = action.parse(await req.json());
  const { id } = await params;
  if (body.action === "submit") {
    const { actor } = await gstActor("gst:write");
    return NextResponse.json(await submitClassification({ kind: "PRODUCT", productId: id }, { hsnId: body.hsnId, effectiveFrom: new Date(`${body.effectiveFrom}T00:00:00.000Z`), basis: body.basis }, actor));
  }
  const { actor } = await gstActor("gst:approve");
  return NextResponse.json(body.action === "approve" ? await approveClassification(body.mappingId, body.approverName, actor) : await rejectClassification(body.mappingId, body.approverName, body.reason, actor));
});
