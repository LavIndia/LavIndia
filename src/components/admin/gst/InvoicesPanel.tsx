"use client";

import Link from "next/link";
import { toast } from "sonner";
import { css } from "styled-system/css";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { rupees, send, shortDate, useGst } from "./gst-client";
import { Hint, Notice, Section, StatusPill, pageStyle, scrollX } from "./gst-ui";

interface Inv { id: string; orderId: string; invoiceNumber: string; invoiceDate: string; kind: string; buyer: string; buyerGstin: string; placeOfSupplyCode: string; supplyType: string; taxableCents: number; totalTaxCents: number; invoiceValueCents: number; eInvoiceStatus: string }
interface Note { id: string; creditNoteNumber: string; orderId: string; kind: string; reason: string; issuedAt: string; totalTaxCents: number; refundCents: number; invoiceNumber: string }
interface Data { invoices: Inv[]; notes: Note[]; mismatches: Array<{ invoiceNumber: string; gst: number; legacy: number }> }

export function InvoicesPanel() {
  const { data, error, reload } = useGst<Data>("/api/admin/gst/invoices");
  if (error) return <Notice tone="bad">{error}</Notice>;
  if (!data) return <Hint>Loading…</Hint>;

  async function repair() {
    try { const r = await send<{ repaired: number; failed: number }>("/api/admin/gst/invoices", "POST", { action: "repair" }); toast.success(`${r.repaired} repaired, ${r.failed} could not be`); await reload(); } catch (e) { toast.error(e instanceof Error ? e.message : "Could not repair"); }
  }

  return (
    <div className={pageStyle}>
      {data.mismatches.length > 0 && <Notice tone="bad">{data.mismatches.length} invoice(s) show a GST value different from the invoice itself: {data.mismatches.map((m) => m.invoiceNumber).join(", ")}. The original invoice is untouched; look into each.</Notice>}
      <Section title="GST invoices" hint="Only orders priced by the GST engine have one. Older invoices are unchanged and stay on the Orders screen." actions={<Button variant="outline" size="sm" onClick={repair}>Fill in missing GST details</Button>}>
        {data.invoices.length === 0 ? <Hint>No GST invoices yet. They appear once the engine is enforced and orders are invoiced.</Hint> : (
          <>
            <div className={css({ display: { base: "none", md: "block" } }) + " " + scrollX}>
              <Table>
                <TableHeader><TableRow><TableHead>Invoice</TableHead><TableHead>Date</TableHead><TableHead>Buyer</TableHead><TableHead>Supply</TableHead><TableHead>Taxable</TableHead><TableHead>Tax</TableHead><TableHead>Value</TableHead><TableHead /></TableRow></TableHeader>
                <TableBody>{data.invoices.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className={css({ fontWeight: "medium" })}>{i.invoiceNumber}</TableCell><TableCell>{shortDate(i.invoiceDate)}</TableCell>
                    <TableCell>{i.buyer || "Walk-in"}{i.buyerGstin && <div className={css({ fontSize: "xs", color: "fg.muted" })}>{i.buyerGstin}</div>}</TableCell>
                    <TableCell className={css({ fontSize: "sm" })}>{i.supplyType === "INTRA_STATE" ? "Intra-state" : "Inter-state"} · {i.kind}</TableCell>
                    <TableCell>{rupees(i.taxableCents)}</TableCell><TableCell>{rupees(i.totalTaxCents)}</TableCell><TableCell>{rupees(i.invoiceValueCents)}</TableCell>
                    <TableCell><Button size="sm" variant="outline" asChild><Link href={`/admin/gst/invoices/${i.orderId}`}>Open</Link></Button></TableCell>
                  </TableRow>))}</TableBody>
              </Table>
            </div>
            <div className={css({ display: { base: "flex", md: "none" }, flexDirection: "column", gap: "2" })}>
              {data.invoices.map((i) => (
                <Link key={i.id} href={`/admin/gst/invoices/${i.orderId}`} className={css({ border: "1px solid", borderColor: "border.subtle", borderRadius: "lg", padding: "3", display: "flex", flexDirection: "column", gap: "1" })}>
                  <div className={css({ display: "flex", justifyContent: "space-between" })}><strong>{i.invoiceNumber}</strong><span>{rupees(i.invoiceValueCents)}</span></div>
                  <span className={css({ fontSize: "xs", color: "fg.muted" })}>{shortDate(i.invoiceDate)} · {i.buyer || "Walk-in"} · tax {rupees(i.totalTaxCents)}</span>
                </Link>
              ))}
            </div>
          </>
        )}
      </Section>
      <Section title="Credit notes">
        {data.notes.length === 0 ? <Hint>No credit notes.</Hint> : data.notes.map((n) => (
          <div key={n.id} className={css({ display: "flex", justifyContent: "space-between", gap: "3", flexWrap: "wrap", fontSize: "sm", borderBottom: "1px solid", borderColor: "border.subtle", paddingBottom: "2" })}>
            <span><strong>{n.creditNoteNumber}</strong> against {n.invoiceNumber} <StatusPill status={n.kind} /></span>
            <span>{shortDate(n.issuedAt)} · tax {rupees(n.totalTaxCents)} · refund {rupees(n.refundCents)} · {n.reason}</span>
          </div>
        ))}
      </Section>
    </div>
  );
}
