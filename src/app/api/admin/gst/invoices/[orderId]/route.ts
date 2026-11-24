import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiHandler } from "@/lib/api-handler";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { DomainError } from "@/modules/_shared/errors";
import { issueGstCreditNote, listGstCreditNotes, refundableLines } from "@/modules/gst/credit-notes";
import { gstActor } from "../../_shared";

export const dynamic = "force-dynamic";

const credit = z.object({
  mode: z.enum(["FULL", "PARTIAL"]),
  reason: z.string().min(1).max(500),
  refunds: z.array(z.object({ lineId: z.string().min(1), refundCents: z.number().int().positive() })).max(100).optional(),
  untaxedRefundCents: z.number().int().min(0).optional(),
  refundReference: z.string().max(120).nullable().optional(),
});

// GET /api/admin/gst/invoices/[orderId] — the GST invoice, its credit notes, and what can still be refunded
export const GET = apiHandler(async (_req: NextRequest, { params }: { params: Promise<{ orderId: string }> }) => {
  await gstActor("gst:read");
  const { orderId } = await params;
  const detail = await prisma.gstInvoiceDetail.findUnique({ where: { orderId } });
  if (!detail) throw new DomainError("NOT_FOUND", "This order has no GST invoice");
  const [notes, refundable, order] = await Promise.all([
    listGstCreditNotes(orderId),
    refundableLines(orderId),
    prisma.order.findUnique({ where: { id: orderId }, select: { orderNumber: true, status: true, paymentStatus: true } }),
  ]);
  return NextResponse.json({ detail, notes, refundable, order });
});

// POST /api/admin/gst/invoices/[orderId] — issue a credit note, whole or part
export const POST = apiHandler(async (req: NextRequest, { params }: { params: Promise<{ orderId: string }> }) => {
  const { admin } = await gstActor("gst:write");
  const { orderId } = await params;
  const input = credit.parse(await req.json());
  if (input.mode === "PARTIAL" && !(input.refunds?.length || input.untaxedRefundCents)) throw new DomainError("VALIDATION_FAILED", "Choose what to refund");
  const note = await issueGstCreditNote(orderId, input, admin.id);
  await createAuditLog({ adminId: admin.id, adminName: admin.name ?? undefined, action: "GST_CREDIT_NOTE", entity: "GstCreditNote", entityId: note.id, metadata: { number: note.creditNoteNumber, orderId, refundCents: note.refundCents, kind: note.kind } });
  return NextResponse.json({ note }, { status: 201 });
});
