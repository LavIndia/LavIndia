"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { css } from "styled-system/css";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InvoicePrintStyles } from "@/components/admin/billing/InvoiceFooter";
import { ScaledPage } from "@/components/admin/billing/ScaledPage";
import { GstInvoiceTemplate, type GstInvoiceView } from "./GstInvoiceTemplate";
import { rupees, send, useGst } from "./gst-client";
import { Hint, Notice, Section, fieldStyle, pageStyle, rowStyle } from "./gst-ui";

interface Detail extends GstInvoiceView { id: string }
interface Data {
  detail: Detail;
  notes: Array<{ id: string; creditNoteNumber: string; issuedAt: string; totalTaxCents: number; refundCents: number; reason: string }>;
  refundable: { lines: Array<{ lineId: string; description: string; payableCents: number; creditedCents: number; remainingCents: number }>; untaxedRemainingCents: number } | null;
  order: { orderNumber: string; status: string; paymentStatus: string } | null;
}

/** One GST invoice: how it prints, and the credit-note form (whole or part). */
export function InvoiceDetailPanel({ orderId }: { orderId: string }) {
  const { data, error, reload } = useGst<Data>(`/api/admin/gst/invoices/${orderId}`);
  const [reason, setReason] = useState("");
  const [reference, setReference] = useState("");
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [untaxed, setUntaxed] = useState("");
  const [busy, setBusy] = useState(false);

  if (error) return <Notice tone="bad">{error}</Notice>;
  if (!data) return <Hint>Loading…</Hint>;
  const { detail, notes, refundable } = data;
  const cents = (v: string) => Math.round(Number(v || 0) * 100);

  async function issue(mode: "FULL" | "PARTIAL") {
    setBusy(true);
    try {
      const refunds = Object.entries(amounts).filter(([, v]) => cents(v) > 0).map(([lineId, v]) => ({ lineId, refundCents: cents(v) }));
      const out = await send<{ note: { creditNoteNumber: string } }>(`/api/admin/gst/invoices/${orderId}`, "POST", { mode, reason, refundReference: reference || null, ...(mode === "PARTIAL" ? { refunds, untaxedRefundCents: cents(untaxed) } : {}) });
      toast.success(`Credit note ${out.note.creditNoteNumber} issued`);
      setReason(""); setReference(""); setAmounts({}); setUntaxed("");
      await reload();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Could not issue the credit note"); } finally { setBusy(false); }
  }

  const canRefund = refundable && (refundable.untaxedRemainingCents > 0 || refundable.lines.some((l) => l.remainingCents > 0));

  return (
    <div className={pageStyle}>
      <InvoicePrintStyles />
      <div className={rowStyle + " " + css({ justifyContent: "space-between" })}>
        <Button variant="outline" size="sm" asChild><Link href="/admin/gst/invoices"><ArrowLeft className={css({ height: "4", width: "4" })} />GST invoices</Link></Button>
        <Button onClick={() => window.print()}><Printer className={css({ height: "4", width: "4" })} />Print or save as PDF</Button>
      </div>

      <div className={css({ border: "1px solid", borderColor: "border.subtle", borderRadius: "md", background: "bg.canvas", padding: { base: "2", md: "4" }, overflow: "auto" })}>
        <ScaledPage><GstInvoiceTemplate invoice={{ ...detail, creditNotes: notes }} /></ScaledPage>
      </div>

      <Section title="Credit note" hint="Reverses tax at the rate the invoice charged, never today's. A credit note takes its number from the same run as the existing ones.">
        {!canRefund ? <Hint>This invoice has been credited in full.</Hint> : (
          <>
            <div className={fieldStyle}><Label htmlFor="cn-reason">Reason</Label><Input id="cn-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Piece returned" /></div>
            <div className={fieldStyle}><Label htmlFor="cn-ref">How the money went back (optional)</Label><Input id="cn-ref" value={reference} onChange={(e) => setReference(e.target.value)} /></div>
            <div className={css({ display: "flex", flexDirection: "column", gap: "2" })}>
              <div className={css({ fontSize: "sm", fontWeight: "medium" })}>For a part refund, enter an amount per line (₹, tax included)</div>
              {refundable!.lines.map((l) => (
                <div key={l.lineId} className={css({ display: "grid", gridTemplateColumns: { base: "1fr 7rem", md: "1fr auto 8rem" }, gap: "2", alignItems: "center", fontSize: "sm" })}>
                  <span>{l.description}</span>
                  <span className={css({ color: "fg.muted", display: { base: "none", md: "block" } })}>up to {rupees(l.remainingCents)} of {rupees(l.payableCents)}</span>
                  <Input aria-label={`Refund for ${l.description}`} inputMode="decimal" disabled={l.remainingCents === 0} value={amounts[l.lineId] ?? ""} onChange={(e) => setAmounts({ ...amounts, [l.lineId]: e.target.value })} />
                </div>
              ))}
              {refundable!.untaxedRemainingCents > 0 && (
                <div className={css({ display: "grid", gridTemplateColumns: { base: "1fr 7rem", md: "1fr auto 8rem" }, gap: "2", alignItems: "center", fontSize: "sm" })}>
                  <span>Charges without GST</span><span className={css({ color: "fg.muted", display: { base: "none", md: "block" } })}>up to {rupees(refundable!.untaxedRemainingCents)}</span>
                  <Input aria-label="Refund of charges without GST" inputMode="decimal" value={untaxed} onChange={(e) => setUntaxed(e.target.value)} />
                </div>
              )}
            </div>
            <div className={rowStyle}>
              <Button disabled={busy || !reason.trim()} onClick={() => issue("PARTIAL")}>Issue part credit note</Button>
              <Button variant="outline" disabled={busy || !reason.trim()} onClick={() => issue("FULL")}>Credit the whole remaining invoice</Button>
            </div>
          </>
        )}
        {notes.map((n) => <Hint key={n.id}>{n.creditNoteNumber} · {new Date(n.issuedAt).toLocaleDateString("en-IN")} · tax {rupees(n.totalTaxCents)} · refunded {rupees(n.refundCents)} · {n.reason}</Hint>)}
      </Section>
    </div>
  );
}
