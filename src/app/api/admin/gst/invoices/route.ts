import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiHandler } from "@/lib/api-handler";
import { prisma } from "@/lib/prisma";
import { repairMissingInvoiceDetails } from "@/modules/gst/invoice-detail";
import { gstActor } from "../_shared";

export const dynamic = "force-dynamic";

// GET /api/admin/gst/invoices — recent GST invoices and credit notes
export const GET = apiHandler(async () => {
  await gstActor("gst:read");
  const [invoices, notes, mismatches] = await Promise.all([
    prisma.gstInvoiceDetail.findMany({ orderBy: { invoiceDate: "desc" }, take: 100, select: { id: true, orderId: true, invoiceNumber: true, invoiceDate: true, kind: true, recipient: true, placeOfSupplyCode: true, supplyType: true, taxableCents: true, totalTaxCents: true, invoiceValueCents: true, eInvoiceStatus: true } }),
    prisma.gstCreditNote.findMany({ orderBy: { issuedAt: "desc" }, take: 100, select: { id: true, creditNoteNumber: true, orderId: true, kind: true, reason: true, issuedAt: true, totalTaxCents: true, refundCents: true, invoiceDetail: { select: { invoiceNumber: true } } } }),
    prisma.$queryRaw<Array<{ invoiceNumber: string; gst: number; legacy: number }>>`SELECT d."invoiceNumber", d."invoiceValueCents"::int AS gst, i."totalCents"::int AS legacy FROM gst_invoice_details d JOIN invoices i ON i."orderId" = d."orderId" WHERE d."invoiceValueCents" <> i."totalCents"`,
  ]);
  return NextResponse.json({
    invoices: invoices.map((i) => ({ ...i, buyer: (i.recipient as { name?: string }).name ?? "", buyerGstin: (i.recipient as { gstin?: string }).gstin ?? "", recipient: undefined })),
    notes: notes.map((n) => ({ ...n, invoiceNumber: n.invoiceDetail.invoiceNumber, invoiceDetail: undefined })),
    mismatches,
  });
});

// POST /api/admin/gst/invoices — write the GST details for any enforced order whose invoice lacks them
export const POST = apiHandler(async (req: NextRequest) => {
  await gstActor("gst:read"); // sign-in comes before the body is read; the action then asks for what it needs
  const { action } = z.object({ action: z.literal("repair") }).parse(await req.json());
  void action;
  await gstActor("gst:write");
  return NextResponse.json(await repairMissingInvoiceDetails());
});
