"use client";

import { useState } from "react";
import { toast } from "sonner";
import { css } from "styled-system/css";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { rupees, send, useGst } from "./gst-client";
import { Hint, Notice, Section, Stat, StatGrid, fieldStyle, gridStyle, pageStyle, rowStyle, scrollX } from "./gst-ui";

type Row = Record<string, string | number | null>;
const now = new Date();
const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

function Grid({ rows, money }: { rows: Row[]; money?: RegExp }) {
  if (rows.length === 0) return <Hint>Nothing in this period.</Hint>;
  const cols = Object.keys(rows[0]);
  const fmt = (k: string, v: string | number | null) => (typeof v === "number" && (money ?? /cents$|taxable|cgst|sgst|igst|cess|total|value|untaxed|^(tax)/i).test(k) ? rupees(v) : (v ?? ""));
  return (
    <div className={scrollX}>
      <Table>
        <TableHeader><TableRow>{cols.map((c) => <TableHead key={c}>{c.replace(/Cents$/, "").replace(/([A-Z])/g, " $1").toLowerCase()}</TableHead>)}</TableRow></TableHeader>
        <TableBody>{rows.map((r, i) => <TableRow key={i}>{cols.map((c) => <TableCell key={c} className={css({ fontSize: "sm", whiteSpace: "nowrap" })}>{String(fmt(c, r[c]))}</TableCell>)}</TableRow>)}</TableBody>
      </Table>
    </div>
  );
}

const csv = (type: string, period: string, table?: string) => `/api/admin/gst/reports?type=${type}&period=${period}&format=csv${table ? `&table=${table}` : ""}`;
const Export = ({ href }: { href: string }) => <Button variant="outline" size="sm" asChild><a href={href}><Download className={css({ height: "4", width: "4" })} />CSV</a></Button>;

/**
 * Figures laid out for whoever files the return. Nothing here files or
 * submits anything, and nothing says a return has been filed.
 */
export function ReportsPanel() {
  const [period, setPeriod] = useState(thisMonth);
  const [type, setType] = useState("gstr1");
  const [heads, setHeads] = useState({ taxable: "", cgst: "", sgst: "", igst: "", cess: "" });
  const [busy, setBusy] = useState(false);
  const { data, error, reload } = useGst<{ data: Record<string, unknown>; mismatches: Array<{ invoiceNumber: string }>; history: Array<{ id: string; status: string; createdAt: string; differences: Record<string, number> }>; notice: string }>(/^\d{4}-(0[1-9]|1[0-2])$/.test(period) ? `/api/admin/gst/reports?type=${type}&period=${period}` : null);

  const d = data?.data as Record<string, unknown> | undefined;
  const rows = (key: string) => ((d?.[key] as Row[] | undefined) ?? []);
  const toCents = (v: string) => Math.round(Number(v || 0) * 100);

  async function reconcile() {
    setBusy(true);
    try {
      const out = await send<{ reconciliation: { status: string } }>("/api/admin/gst/reports", "POST", { period, entered: { taxableCents: toCents(heads.taxable), cgstCents: toCents(heads.cgst), sgstCents: toCents(heads.sgst), igstCents: toCents(heads.igst), cessCents: toCents(heads.cess) } });
      toast.success(out.reconciliation.status === "MATCHED" ? "Matches the books" : "Saved — there are differences");
      await reload();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Could not save"); } finally { setBusy(false); }
  }

  return (
    <div className={pageStyle}>
      <Notice>These are working figures for whoever files the return. <strong>Nothing here files or submits a return</strong>, and nothing here says one has been filed. Only invoices issued with GST details appear; older invoices are counted as left out.</Notice>
      <Section title="Period and report">
        <div className={gridStyle}>
          <div className={fieldStyle}><Label htmlFor="rp-period">Month</Label><Input id="rp-period" type="month" value={period} onChange={(e) => setPeriod(e.target.value)} /></div>
          <div className={fieldStyle}><Label htmlFor="rp-type">Report</Label><Select value={type} onValueChange={setType}><SelectTrigger id="rp-type"><SelectValue /></SelectTrigger><SelectContent>
            <SelectItem value="gstr1">GSTR-1 data</SelectItem><SelectItem value="sales-register">Sales register</SelectItem><SelectItem value="hsn">HSN-wise sales</SelectItem><SelectItem value="liability">Tax liability</SelectItem><SelectItem value="gstr3b">GSTR-3B reconciliation</SelectItem></SelectContent></Select></div>
        </div>
      </Section>

      {error && <Notice tone="bad">{error}</Notice>}
      {data && data.mismatches.length > 0 && <Notice tone="bad">{data.mismatches.length} invoice(s) this month have a GST value that differs from the invoice itself: {data.mismatches.map((m) => m.invoiceNumber).join(", ")}.</Notice>}
      {d && typeof d.leftOutInvoices === "number" && d.leftOutInvoices > 0 && <Notice tone="warn">{d.leftOutInvoices} invoice(s) issued this month have no GST details (issued before GST was enforced, or not yet repaired) and are not in these figures.</Notice>}

      {d && type === "gstr1" && (
        <Tabs defaultValue="b2b" className={css({ display: "flex", flexDirection: "column", gap: "3" })}>
          <TabsList><TabsTrigger value="b2b">B2B</TabsTrigger><TabsTrigger value="b2cs">B2C by rate</TabsTrigger><TabsTrigger value="b2cInterState">B2C inter-state</TabsTrigger><TabsTrigger value="cdnr">Credit notes (registered)</TabsTrigger><TabsTrigger value="cdnur">Credit notes (consumers)</TabsTrigger><TabsTrigger value="hsn">HSN summary</TabsTrigger></TabsList>
          {(["b2b", "b2cs", "b2cInterState", "cdnr", "cdnur", "hsn"] as const).map((t) => (
            <TabsContent key={t} value={t}><Section title={t} actions={<Export href={csv("gstr1", period, t)} />}><Grid rows={rows(t)} /></Section></TabsContent>
          ))}
        </Tabs>
      )}

      {d && type === "sales-register" && <Section title="Sales register" actions={<Export href={csv("sales-register", period)} />}><Grid rows={rows("rows")} /></Section>}
      {Array.isArray(d) && type === "hsn" && <Section title="HSN-wise sales" actions={<Export href={csv("hsn", period)} />}><Grid rows={d as unknown as Row[]} /></Section>}

      {d && type === "liability" && (
        <Section title="Tax liability" hint="Outward tax less credit notes, by head.">
          <StatGrid>
            {(["cgstCents", "sgstCents", "igstCents", "cessCents"] as const).map((k) => <Stat key={k} label={k.replace("Cents", "").toUpperCase()} value={rupees((d.net as Record<string, number>)[k])} sub={`outward ${rupees((d.outward as Record<string, number>)[k])} − credits ${rupees((d.credited as Record<string, number>)[k])}`} />)}
          </StatGrid>
          <Stat label="Total tax payable for the month" value={rupees(d.totalTaxCents as number)} sub={`${d.invoiceCount} invoice(s), ${d.creditNoteCount} credit note(s)`} />
        </Section>
      )}

      {d && type === "gstr3b" && (
        <Section title="GSTR-3B reconciliation" hint="Outward supplies net of credit notes, set against what you read off the return. Saving keeps the comparison; it files nothing.">
          <StatGrid>
            <Stat label="Taxable value" value={rupees((d.taxable as Record<string, number>).taxableCents)} />
            <Stat label="IGST" value={rupees((d.taxable as Record<string, number>).igstCents)} />
            <Stat label="CGST / SGST" value={`${rupees((d.taxable as Record<string, number>).cgstCents)} / ${rupees((d.taxable as Record<string, number>).sgstCents)}`} />
            <Stat label="Nil-rated / exempt value" value={rupees(d.nilRatedTaxableCents as number)} />
          </StatGrid>
          <div className={css({ fontSize: "sm", fontWeight: "medium" })}>Figures on the return (in rupees)</div>
          <div className={css({ display: "grid", gridTemplateColumns: { base: "1fr 1fr", md: "repeat(5, 1fr)" }, gap: "2" })}>
            {(["taxable", "igst", "cgst", "sgst", "cess"] as const).map((k) => <div key={k} className={fieldStyle}><Label htmlFor={`h-${k}`}>{k}</Label><Input id={`h-${k}`} inputMode="decimal" value={heads[k]} onChange={(e) => setHeads({ ...heads, [k]: e.target.value })} /></div>)}
          </div>
          <div className={rowStyle}><Button onClick={reconcile} disabled={busy}>Save the comparison</Button></div>
          {(data?.history ?? []).map((h) => <Hint key={h.id}>{new Date(h.createdAt).toLocaleDateString("en-IN")}: {h.status === "MATCHED" ? "matched" : `differences — ${Object.entries(h.differences).filter(([, v]) => v !== 0).map(([k, v]) => `${k.replace("Cents", "")} ${v > 0 ? "+" : "−"}${rupees(Math.abs(v))}`).join(", ")}`}</Hint>)}
        </Section>
      )}
    </div>
  );
}
