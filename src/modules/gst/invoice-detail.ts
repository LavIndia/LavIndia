/**
 * The GST particulars of an invoice, written when the invoice is issued.
 *
 * The invoice itself — its number, its snapshot, its table — is the existing
 * billing system's and is never touched. This adds, beside it, what a GST tax
 * invoice must also say and the old snapshot cannot: the supplier's GSTIN and
 * state, the HSN, the taxable value, the rate and the CGST / SGST / IGST of
 * every line, the place of supply and the declarations. It is built from the
 * calculation recorded when the order was made, so the invoice shows exactly
 * the tax the customer was charged, never a recalculation.
 *
 * Failing to write it must never stop an invoice being issued — the customer
 * has paid — so it runs in a savepoint and a failure leaves the invoice as it
 * is, flagged on the GST dashboard for repair.
 */
import type { Prisma } from "@prisma/client";
import { prisma, type Tx } from "../_shared/db";
import { gstinProblem } from "./places";
import { engineMode } from "./state";

const UQC = "NOS";

interface AuditLine {
  lineId: string;
  kind: "GOODS" | "SHIPPING" | "COD_FEE";
  code: string;
  codeKind: "HSN" | "SAC";
  rateVersionId: string;
  rateBps: number;
  cessBps: number;
  inputCents: number;
  taxableCents: number;
  cgstCents: number;
  sgstCents: number;
  igstCents: number;
  cessCents: number;
  taxCents: number;
  payableCents: number;
}

interface AuditInputs {
  charges: { shippingCents: number; codFeeCents: number; shippingTreatment: string; codTreatment: string };
  lines: Array<{ index: number; name: string; quantity: number; amountCents: number }>;
}

export interface InvoiceIssue {
  orderId: string;
  invoiceNumber: string;
  financialYear: string;
  issuedAt: Date;
  invoiceTotalCents: number;
}

/** Runs `work` so that if it fails the surrounding transaction carries on unharmed. */
export async function inSavepoint<T>(client: Tx, name: string, work: () => Promise<T>): Promise<T | null> {
  await client.$executeRawUnsafe(`SAVEPOINT ${name}`);
  try {
    const result = await work();
    await client.$executeRawUnsafe(`RELEASE SAVEPOINT ${name}`);
    return result;
  } catch (error) {
    await client.$executeRawUnsafe(`ROLLBACK TO SAVEPOINT ${name}`);
    await client.$executeRawUnsafe(`RELEASE SAVEPOINT ${name}`);
    console.error(`GST step "${name}" failed and was skipped:`, error);
    return null;
  }
}

function describe(line: AuditLine, inputs: AuditInputs, position: number) {
  const goodsIndex = line.kind === "GOODS" ? Number(line.lineId) : null;
  const named = goodsIndex === null ? null : inputs.lines.find((l) => l.index === goodsIndex);
  const description = named?.name ?? (line.kind === "SHIPPING" ? "Delivery charges" : "Cash on delivery charges");
  return {
    position,
    lineId: line.lineId,
    kind: line.kind,
    description,
    code: line.code,
    codeKind: line.codeKind,
    uqc: UQC,
    quantity: named?.quantity ?? 1,
    rateVersionId: line.rateVersionId,
    rateBps: line.rateBps,
    cessBps: line.cessBps,
    inputCents: line.inputCents,
    taxableCents: line.taxableCents,
    cgstCents: line.cgstCents,
    sgstCents: line.sgstCents,
    igstCents: line.igstCents,
    cessCents: line.cessCents,
    taxCents: line.taxCents,
    payableCents: line.payableCents,
  };
}

/** Writes the GST detail for an issued invoice, when the order was priced by the engine. Returns its id. */
export async function createGstInvoiceDetail(client: Tx, issue: InvoiceIssue): Promise<string | null> {
  const audit = await client.gstCalculationAudit.findFirst({ where: { orderId: issue.orderId, mode: "ENFORCE", outcome: { in: ["MATCHED", "DIFFERS"] } }, orderBy: { calculatedAt: "desc" } });
  if (!audit || !audit.supplyType || !audit.placeOfSupplyCode || !audit.supplierStateCode) return null;

  const [profile, order] = await Promise.all([
    client.gstBusinessProfile.findFirst(),
    client.order.findUnique({ where: { id: issue.orderId }, select: { customerName: true, customerMobile: true, customerGstin: true, address: true, user: { select: { name: true, email: true } } } }),
  ]);
  if (!profile?.gstin || !profile.legalName || !profile.registeredAddress || !order) return null;

  const inputs = audit.inputs as unknown as AuditInputs;
  const auditLines = audit.lines as unknown as AuditLine[];
  const lines = auditLines.map((line, index) => describe(line, inputs, index + 1));

  const untaxed =
    (inputs.charges.shippingTreatment === "NONE" || inputs.charges.shippingTreatment === "UNSET" ? inputs.charges.shippingCents : 0) +
    (inputs.charges.codTreatment === "NONE" || inputs.charges.codTreatment === "UNSET" ? inputs.charges.codFeeCents : 0);

  const buyerGstin = order.customerGstin?.trim().toUpperCase() || null;
  const validGstin = buyerGstin && !gstinProblem(buyerGstin) ? buyerGstin : null;
  const address = order.address;

  const rateSummary = new Map<string, { rateVersionId: string; code: string; rateBps: number; taxableCents: number; cgstCents: number; sgstCents: number; igstCents: number; cessCents: number }>();
  for (const l of lines) {
    const row = rateSummary.get(l.rateVersionId) ?? { rateVersionId: l.rateVersionId, code: l.code, rateBps: l.rateBps, taxableCents: 0, cgstCents: 0, sgstCents: 0, igstCents: 0, cessCents: 0 };
    row.taxableCents += l.taxableCents; row.cgstCents += l.cgstCents; row.sgstCents += l.sgstCents; row.igstCents += l.igstCents; row.cessCents += l.cessCents;
    rateSummary.set(l.rateVersionId, row);
  }

  const row = await client.gstInvoiceDetail.create({
    data: {
      orderId: issue.orderId,
      invoiceNumber: issue.invoiceNumber,
      financialYear: issue.financialYear,
      invoiceDate: issue.issuedAt,
      kind: validGstin ? "B2B" : "B2C",
      supplier: { name: profile.tradeName ?? profile.legalName, legalName: profile.legalName, gstin: profile.gstin, stateCode: profile.stateCode, address: profile.registeredAddress },
      recipient: {
        name: order.customerName ?? address?.fullName ?? order.user?.name ?? null,
        gstin: validGstin,
        ...(buyerGstin && !validGstin ? { unverifiedGstin: buyerGstin } : {}),
        mobile: order.customerMobile ?? address?.mobile ?? null,
        addressLines: address ? [address.addressLine1, address.addressLine2, `${address.city}, ${address.state} ${address.pincode}`].filter(Boolean) : [],
        state: address?.state ?? null,
        stateCode: audit.placeOfSupplyCode,
      } as Prisma.InputJsonValue,
      supplierStateCode: audit.supplierStateCode,
      placeOfSupplyCode: audit.placeOfSupplyCode,
      supplyType: audit.supplyType,
      pricesIncludeTax: (audit.inputs as { pricesIncludeTax?: boolean }).pricesIncludeTax ?? false,
      lines: lines as unknown as Prisma.InputJsonValue,
      rateSummary: [...rateSummary.values()] as unknown as Prisma.InputJsonValue,
      taxableCents: audit.taxableCents,
      cgstCents: audit.cgstCents,
      sgstCents: audit.sgstCents,
      igstCents: audit.igstCents,
      cessCents: audit.cessCents,
      totalTaxCents: audit.totalTaxCents,
      untaxedChargesCents: untaxed,
      invoiceValueCents: audit.taxableCents + audit.totalTaxCents + untaxed,
      reverseCharge: false,
      declarations: ["Tax is not payable on reverse charge"],
      auditId: audit.id,
      eInvoiceStatus: profile.eInvoicingApplies ? "NOT_GENERATED" : "NOT_APPLICABLE",
    },
    select: { id: true, invoiceValueCents: true },
  });
  if (row.invoiceValueCents !== issue.invoiceTotalCents) {
    console.error(`GST invoice ${issue.invoiceNumber}: GST value ${row.invoiceValueCents} differs from the invoice total ${issue.invoiceTotalCents}`);
  }
  return row.id;
}

/**
 * Called by billing as an invoice is issued. Does nothing while the engine is OFF,
 * and can never stop the invoice: a failure is swallowed (and logged) in a savepoint.
 */
export async function onInvoiceIssued(client: Tx, issue: InvoiceIssue): Promise<void> {
  if ((await engineMode()) === "OFF") return;
  await inSavepoint(client, "gst_invoice_detail", () => createGstInvoiceDetail(client, issue));
}

/** Writes the detail for any enforced order whose invoice was issued without one. */
export async function repairMissingInvoiceDetails(): Promise<{ repaired: number; failed: number }> {
  const audits = await prisma.gstCalculationAudit.findMany({ where: { mode: "ENFORCE", orderId: { not: null }, outcome: { in: ["MATCHED", "DIFFERS"] } }, select: { orderId: true } });
  const orderIds = [...new Set(audits.map((a) => a.orderId!))];
  if (orderIds.length === 0) return { repaired: 0, failed: 0 };
  const [invoices, have] = await Promise.all([
    prisma.invoice.findMany({ where: { orderId: { in: orderIds } }, select: { orderId: true, invoiceNumber: true, financialYear: true, issuedAt: true, totalCents: true } }),
    prisma.gstInvoiceDetail.findMany({ where: { orderId: { in: orderIds } }, select: { orderId: true } }),
  ]);
  const done = new Set(have.map((h) => h.orderId));
  let repaired = 0;
  let failed = 0;
  for (const invoice of invoices.filter((i) => !done.has(i.orderId))) {
    try {
      const id = await prisma.$transaction((tx) => createGstInvoiceDetail(tx, { orderId: invoice.orderId, invoiceNumber: invoice.invoiceNumber, financialYear: invoice.financialYear, issuedAt: invoice.issuedAt, invoiceTotalCents: invoice.totalCents }));
      if (id) repaired++; else failed++;
    } catch { failed++; }
  }
  return { repaired, failed };
}
