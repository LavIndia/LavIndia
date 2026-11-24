import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/user/orders/[orderId]/gst-invoice
 *
 * The GST tax invoice for the signed-in customer's own order. Ownership is
 * checked on the order itself, and a missing invoice and someone else's order
 * answer identically, so an order number cannot be probed.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { orderId } = await params;

  const order = await prisma.order.findFirst({
    where: { id: orderId, user: { OR: [{ id: session.user.id || "none" }, { email: session.user.email || "none" }] } },
    select: { id: true },
  });
  const detail = order ? await prisma.gstInvoiceDetail.findUnique({ where: { orderId: order.id } }) : null;
  if (!order || !detail) return NextResponse.json({ error: "No GST invoice is available for this order" }, { status: 404 });

  const notes = await prisma.gstCreditNote.findMany({ where: { orderId: order.id }, orderBy: { issuedAt: "asc" }, select: { creditNoteNumber: true, issuedAt: true, totalTaxCents: true, refundCents: true } });
  const supplier = detail.supplier as Record<string, unknown>;
  return NextResponse.json({
    invoice: {
      invoiceNumber: detail.invoiceNumber, invoiceDate: detail.invoiceDate, supplier, recipient: detail.recipient,
      placeOfSupplyCode: detail.placeOfSupplyCode, supplyType: detail.supplyType, lines: detail.lines, rateSummary: detail.rateSummary,
      taxableCents: detail.taxableCents, cgstCents: detail.cgstCents, sgstCents: detail.sgstCents, igstCents: detail.igstCents, cessCents: detail.cessCents,
      totalTaxCents: detail.totalTaxCents, untaxedChargesCents: detail.untaxedChargesCents, invoiceValueCents: detail.invoiceValueCents,
      reverseCharge: detail.reverseCharge, declarations: detail.declarations, irn: detail.irn, creditNotes: notes,
    },
  }, { headers: { "Cache-Control": "private, no-store" } });
}
