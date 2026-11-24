/**
 * GST reports, prepared from the GST invoice details and credit notes.
 *
 * These are working figures for whoever files the return — laid out the way
 * the return asks for them — and nothing here files, submits or claims to
 * have filed anything. Only invoices with GST details appear: an invoice from
 * before the engine was enforced has none, and the totals say how many
 * invoices in the period were left out for that reason.
 *
 * A month is an India calendar month: an invoice at 00:30 on the 1st IST
 * belongs to that month, whichever time zone the server is in.
 */
import Papa from "papaparse";
import { prisma } from "../_shared/db";
import { DomainError } from "../_shared/errors";
import { stateName } from "./places";

export type Period = string; // "2026-10"

export function monthRange(period: Period): { from: Date; to: Date } {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(period);
  if (!match) throw new DomainError("VALIDATION_FAILED", "A period looks like 2026-10");
  const year = Number(match[1]);
  const month = Number(match[2]);
  const next = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 };
  const pad = (n: number) => String(n).padStart(2, "0");
  return { from: new Date(`${year}-${pad(month)}-01T00:00:00+05:30`), to: new Date(`${next.y}-${pad(next.m)}-01T00:00:00+05:30`) };
}

interface DetailLine {
  lineId: string; kind: string; description: string; code: string; codeKind: string; quantity: number; uqc: string;
  rateBps: number; taxableCents: number; cgstCents: number; sgstCents: number; igstCents: number; cessCents: number; payableCents: number;
}
interface CreditLineRow { lineId: string; kind: string; taxableCents: number; cgstCents: number; sgstCents: number; igstCents: number; cessCents: number; payableCents: number }

const ZERO = { taxableCents: 0, cgstCents: 0, sgstCents: 0, igstCents: 0, cessCents: 0 };
type Heads = typeof ZERO;
const add = (a: Heads, b: Partial<Heads>): Heads => ({ taxableCents: a.taxableCents + (b.taxableCents ?? 0), cgstCents: a.cgstCents + (b.cgstCents ?? 0), sgstCents: a.sgstCents + (b.sgstCents ?? 0), igstCents: a.igstCents + (b.igstCents ?? 0), cessCents: a.cessCents + (b.cessCents ?? 0) });
const neg = (a: Heads): Heads => ({ taxableCents: -a.taxableCents, cgstCents: -a.cgstCents, sgstCents: -a.sgstCents, igstCents: -a.igstCents, cessCents: -a.cessCents });

async function load(period: Period) {
  const { from, to } = monthRange(period);
  const [invoices, notes, totalInvoices] = await Promise.all([
    prisma.gstInvoiceDetail.findMany({ where: { invoiceDate: { gte: from, lt: to } }, orderBy: { invoiceDate: "asc" } }),
    prisma.gstCreditNote.findMany({ where: { issuedAt: { gte: from, lt: to } }, orderBy: { issuedAt: "asc" }, include: { invoiceDetail: { select: { invoiceNumber: true, invoiceDate: true, kind: true, recipient: true, placeOfSupplyCode: true } } } }),
    prisma.invoice.count({ where: { issuedAt: { gte: from, lt: to } } }),
  ]);
  return { invoices, notes, leftOut: Math.max(0, totalInvoices - invoices.length) };
}

const day = (d: Date) => new Date(d.getTime() + 5.5 * 3_600_000).toISOString().slice(0, 10);
const rupees = (cents: number) => (cents / 100).toFixed(2);

export async function salesRegister(period: Period) {
  const { invoices, notes, leftOut } = await load(period);
  const rows = [
    ...invoices.map((i) => ({ date: day(i.invoiceDate), document: i.invoiceNumber, type: "Invoice", buyer: (i.recipient as { name?: string }).name ?? "", gstin: (i.recipient as { gstin?: string }).gstin ?? "", placeOfSupply: `${i.placeOfSupplyCode} ${stateName(i.placeOfSupplyCode) ?? ""}`.trim(), supply: i.supplyType, taxable: i.taxableCents, cgst: i.cgstCents, sgst: i.sgstCents, igst: i.igstCents, cess: i.cessCents, untaxed: i.untaxedChargesCents, total: i.invoiceValueCents })),
    ...notes.map((n) => ({ date: day(n.issuedAt), document: n.creditNoteNumber, type: `Credit note against ${n.invoiceDetail.invoiceNumber}`, buyer: (n.invoiceDetail.recipient as { name?: string }).name ?? "", gstin: (n.invoiceDetail.recipient as { gstin?: string }).gstin ?? "", placeOfSupply: `${n.invoiceDetail.placeOfSupplyCode} ${stateName(n.invoiceDetail.placeOfSupplyCode) ?? ""}`.trim(), supply: "", taxable: -n.taxableCents, cgst: -n.cgstCents, sgst: -n.sgstCents, igst: -n.igstCents, cess: -n.cessCents, untaxed: -(n.refundCents - n.taxableCents - n.totalTaxCents), total: -n.refundCents })),
  ].sort((a, b) => a.date.localeCompare(b.date) || a.document.localeCompare(b.document));
  return { period, rows, invoiceCount: invoices.length, creditNoteCount: notes.length, leftOutInvoices: leftOut };
}

/** GSTR-1 style tables: B2B, B2C by place of supply and rate, inter-state B2C, credit notes, HSN summary. */
export async function gstr1(period: Period) {
  const { invoices, notes, leftOut } = await load(period);

  const b2b = invoices.filter((i) => i.kind === "B2B").map((i) => ({ gstin: (i.recipient as { gstin: string }).gstin, name: (i.recipient as { name?: string }).name ?? "", invoice: i.invoiceNumber, date: day(i.invoiceDate), value: i.invoiceValueCents, placeOfSupply: i.placeOfSupplyCode, reverseCharge: i.reverseCharge ? "Y" : "N", taxable: i.taxableCents, igst: i.igstCents, cgst: i.cgstCents, sgst: i.sgstCents, cess: i.cessCents }));

  const b2cLines = invoices.filter((i) => i.kind === "B2C").flatMap((i) => (i.lines as unknown as DetailLine[]).map((l) => ({ pos: i.placeOfSupplyCode, supply: i.supplyType, ...l })));
  const groups = new Map<string, { placeOfSupply: string; supply: string; rateBps: number } & Heads>();
  for (const l of b2cLines) {
    const key = `${l.pos}|${l.rateBps}`;
    const g = groups.get(key) ?? { placeOfSupply: l.pos, supply: l.supply, rateBps: l.rateBps, ...ZERO };
    groups.set(key, { ...g, ...add(g, l) });
  }
  const b2cs = [...groups.values()].sort((a, b) => a.placeOfSupply.localeCompare(b.placeOfSupply) || a.rateBps - b.rateBps);
  const b2cInterState = invoices.filter((i) => i.kind === "B2C" && i.supplyType === "INTER_STATE").map((i) => ({ invoice: i.invoiceNumber, date: day(i.invoiceDate), value: i.invoiceValueCents, placeOfSupply: i.placeOfSupplyCode, taxable: i.taxableCents, igst: i.igstCents }));

  const note = (n: (typeof notes)[number]) => ({ note: n.creditNoteNumber, date: day(n.issuedAt), against: n.invoiceDetail.invoiceNumber, againstDate: day(n.invoiceDetail.invoiceDate), value: n.refundCents, taxable: n.taxableCents, igst: n.igstCents, cgst: n.cgstCents, sgst: n.sgstCents, cess: n.cessCents, gstin: (n.invoiceDetail.recipient as { gstin?: string }).gstin ?? "", placeOfSupply: n.invoiceDetail.placeOfSupplyCode });
  const cdnr = notes.filter((n) => n.invoiceDetail.kind === "B2B").map(note);
  const cdnur = notes.filter((n) => n.invoiceDetail.kind === "B2C").map(note);

  return { period, b2b, b2cs, b2cInterState, cdnr, cdnur, hsn: await hsnSummary(period), leftOutInvoices: leftOut };
}

/** HSN-wise sales: quantity, value and tax by code, with credit notes shown separately. */
export async function hsnSummary(period: Period) {
  const { invoices, notes } = await load(period);
  const rows = new Map<string, { code: string; uqc: string; rateBps: number; quantity: number; valueCents: number } & Heads>();
  for (const l of invoices.flatMap((i) => i.lines as unknown as DetailLine[])) {
    const key = `${l.code}|${l.rateBps}`;
    const r = rows.get(key) ?? { code: l.code, uqc: l.uqc, rateBps: l.rateBps, quantity: 0, valueCents: 0, ...ZERO };
    rows.set(key, { ...r, ...add(r, l), quantity: r.quantity + (l.kind === "GOODS" ? l.quantity : 0), valueCents: r.valueCents + l.payableCents });
  }
  const codes = await prisma.gstHsnMaster.findMany({ where: { code: { in: [...rows.values()].map((r) => r.code) } }, select: { code: true, description: true } });
  const describe = new Map(codes.map((c) => [c.code, c.description]));
  const credited = new Map<string, Heads & { valueCents: number }>();
  for (const l of notes.flatMap((n) => n.lines as unknown as Array<CreditLineRow & { code?: string; rateBps?: number }>)) {
    if (!l.code) continue;
    const key = `${l.code}|${l.rateBps}`;
    const c = credited.get(key) ?? { ...ZERO, valueCents: 0 };
    credited.set(key, { ...add(c, l), valueCents: c.valueCents + l.payableCents });
  }
  return [...rows.entries()].map(([key, r]) => ({ ...r, description: describe.get(r.code) ?? "", creditedTaxableCents: credited.get(key)?.taxableCents ?? 0, creditedValueCents: credited.get(key)?.valueCents ?? 0 })).sort((a, b) => a.code.localeCompare(b.code));
}

/** Tax payable for the month: outward tax less credit notes, by head. */
export async function taxLiability(period: Period) {
  const { invoices, notes, leftOut } = await load(period);
  const outward = invoices.reduce((s, i) => add(s, i), { ...ZERO });
  const credited = notes.reduce((s, n) => add(s, n), { ...ZERO });
  const net = add(outward, neg(credited));
  return { period, outward, credited, net, totalTaxCents: net.cgstCents + net.sgstCents + net.igstCents + net.cessCents, invoiceCount: invoices.length, creditNoteCount: notes.length, leftOutInvoices: leftOut };
}

export type Gstr3bFigures = Heads;

/**
 * The shop's own figures for the outward-supply boxes of GSTR-3B, net of credit
 * notes, split into taxable and nil-rated. A nil-rated line and an exempt one
 * look the same in the GST details, so both land under nil-rated.
 */
export async function gstr3bFigures(period: Period) {
  const { invoices, notes, leftOut } = await load(period);
  let taxable = { ...ZERO };
  let nilRatedTaxableCents = 0;
  for (const l of invoices.flatMap((i) => i.lines as unknown as DetailLine[])) {
    if (l.rateBps === 0) nilRatedTaxableCents += l.taxableCents; else taxable = add(taxable, l);
  }
  for (const n of notes) {
    for (const l of n.lines as unknown as Array<CreditLineRow & { rateBps?: number }>) {
      if ((l.rateBps ?? 1) === 0) nilRatedTaxableCents -= l.taxableCents; else if (l.lineId !== "UNTAXED") taxable = add(taxable, neg(add({ ...ZERO }, l)));
    }
  }
  return { period, taxable, nilRatedTaxableCents, leftOutInvoices: leftOut };
}

export interface ReconcileInput {
  /** What was read off the return, in paise. */
  entered: Heads;
  note?: string | null;
}

/** Sets the shop's figures against what was entered on the return. Saves the comparison; files nothing. */
export async function reconcileGstr3b(period: Period, input: ReconcileInput, enteredBy: string) {
  const computed = await gstr3bFigures(period);
  const diff = (k: keyof Heads) => input.entered[k] - computed.taxable[k];
  const differences = { taxableCents: diff("taxableCents"), cgstCents: diff("cgstCents"), sgstCents: diff("sgstCents"), igstCents: diff("igstCents"), cessCents: diff("cessCents") };
  const matched = Object.values(differences).every((v) => v === 0);
  return prisma.gstReturnReconciliation.create({
    data: { period, returnType: "GSTR3B", entered: input.entered as unknown as object, computed: { ...computed.taxable, nilRatedTaxableCents: computed.nilRatedTaxableCents, leftOutInvoices: computed.leftOutInvoices }, differences, status: matched ? "MATCHED" : "DIFFERENCES", note: input.note ?? null, enteredBy },
  });
}

export const tableToCsv = (rows: Array<Record<string, unknown>>): string => "﻿" + Papa.unparse(rows.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, typeof v === "number" && /cents$|taxable|cgst|sgst|igst|cess|total|value|untaxed/i.test(k) ? (k === "rateBps" ? v : rupees(v)) : v]))));

/** Whether any invoice in the period has GST details whose value differs from the invoice it belongs to. */
export async function invoiceDetailMismatches(period: Period) {
  const { from, to } = monthRange(period);
  const rows = await prisma.$queryRaw<Array<{ invoiceNumber: string; gst: number; legacy: number }>>`
    SELECT d."invoiceNumber", d."invoiceValueCents"::int AS gst, i."totalCents"::int AS legacy
      FROM gst_invoice_details d JOIN invoices i ON i."orderId" = d."orderId"
     WHERE d."invoiceDate" >= ${from} AND d."invoiceDate" < ${to} AND d."invoiceValueCents" <> i."totalCents"`;
  return rows;
}
