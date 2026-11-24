"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { css } from "styled-system/css";
import { Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { send, useGst, rupees } from "./gst-client";
import { ProductEditor } from "./ProductEditor";
import { Hint, Notice, Section, StatusPill, pageStyle, rowStyle, scrollX } from "./gst-ui";

interface Row { productId: string; name: string; category: string; priceCents: number; infoStatus: string; missing: string[]; suggested: string[]; mapping: { id: string; status: string; code: string | null; approvedBy: string | null } | null }
interface Data { products: Row[]; pending: Array<{ id: string; kind: string; name: string; categoryName: string | null; note: string | null; status: string }>; hsn: Array<{ id: string; code: string; description: string }> }
interface Preview { saved: number; skippedNotInCatalog: number; issues: Array<{ line: number; message: string }>; dryRun: boolean }

const statusOf = (r: Row) => r.mapping?.status ?? "NEEDS_PRODUCT_INFORMATION";
const FILTERS = [["all", "All products"], ["info", "Need information"], ["approval", "Awaiting the accountant"], ["verified", "Verified"]] as const;

export function ClassificationBoard() {
  const { data, error, reload } = useGst<Data>("/api/admin/gst/products");
  const [open, setOpen] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [csv, setCsv] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const file = useRef<HTMLInputElement>(null);

  if (error) return <Notice tone="bad">{error}</Notice>;
  if (!data) return <Hint>Loading…</Hint>;

  const shown = data.products.filter((r) => filter === "all" || (filter === "verified" && statusOf(r) === "VERIFIED") || (filter === "approval" && statusOf(r) === "NEEDS_ACCOUNTANT_APPROVAL") || (filter === "info" && statusOf(r) === "NEEDS_PRODUCT_INFORMATION"));

  async function pick(files: FileList | null) {
    const chosen = files?.[0];
    if (!chosen) return;
    const text = await chosen.text();
    setCsv(text);
    try { setPreview(await send<Preview>("/api/admin/gst/material-sheet", "POST", { csv: text, dryRun: true })); } catch (e) { toast.error(e instanceof Error ? e.message : "Could not read the sheet"); setCsv(null); }
  }
  async function importNow() {
    if (!csv) return;
    try { const out = await send<Preview>("/api/admin/gst/material-sheet", "POST", { csv, dryRun: false }); toast.success(`${out.saved} piece${out.saved === 1 ? "" : "s"} saved`); setCsv(null); setPreview(null); if (file.current) file.current.value = ""; await reload(); } catch (e) { toast.error(e instanceof Error ? e.message : "Could not import"); }
  }

  const open_ = (id: string) => () => setOpen(id);
  const code = (r: Row) => (r.mapping?.code ? `HSN ${r.mapping.code}` : r.suggested.length ? `Suggested ${r.suggested.join(" / ")}` : "—");

  return (
    <div className={pageStyle}>
      <Notice>All pieces stay <strong>Needs product information</strong> until what each is made of is entered and confirmed. Nothing is inferred from a name or a price, and no heading is chosen for you.</Notice>

      <Section title="Material sheet" hint="Download one row per product, fill in the blanks in Excel, and upload it back. A preview shows exactly what would be saved before anything is.">
        <div className={rowStyle}>
          {/* A file download from an API route, not a page: a plain anchor is correct. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <Button variant="outline" asChild><a href="/api/admin/gst/material-sheet"><Download className={css({ height: "4", width: "4" })} />Download the sheet</a></Button>
          <Button variant="outline" onClick={() => file.current?.click()}><Upload className={css({ height: "4", width: "4" })} />Upload a filled sheet</Button>
          <input ref={file} type="file" accept=".csv,text/csv" hidden onChange={(e) => pick(e.target.files)} />
        </div>
        {preview && (
          <div className={css({ display: "flex", flexDirection: "column", gap: "2" })}>
            <Notice tone={preview.issues.length ? "warn" : "info"}>{preview.saved} row{preview.saved === 1 ? "" : "s"} ready to save{preview.skippedNotInCatalog ? `, ${preview.skippedNotInCatalog} for pieces not in the catalog yet (skipped)` : ""}{preview.issues.length ? `, ${preview.issues.length} problem${preview.issues.length === 1 ? "" : "s"}` : ""}.</Notice>
            {preview.issues.length > 0 && <ul className={css({ fontSize: "sm", paddingLeft: "5", listStyle: "disc", maxHeight: "40", overflowY: "auto" })}>{preview.issues.map((i, n) => <li key={n}>Line {i.line || "—"}: {i.message}</li>)}</ul>}
            <div className={rowStyle}><Button onClick={importNow} disabled={preview.saved === 0}>Save {preview.saved} row{preview.saved === 1 ? "" : "s"}</Button><Button variant="outline" onClick={() => { setPreview(null); setCsv(null); if (file.current) file.current.value = ""; }}>Cancel</Button></div>
          </div>
        )}
      </Section>

      <Section title="Products" actions={
        <Select value={filter} onValueChange={setFilter}><SelectTrigger className={css({ width: "14rem" })} aria-label="Filter"><SelectValue /></SelectTrigger><SelectContent>{FILTERS.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select>
      }>
        <div className={css({ display: { base: "none", md: "block" } }) + " " + scrollX}>
          <Table>
            <TableHeader><TableRow><TableHead>Piece</TableHead><TableHead>Material details</TableHead><TableHead>Classification</TableHead><TableHead>Heading</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>
              {shown.map((r) => (
                <TableRow key={r.productId}>
                  <TableCell><div className={css({ fontWeight: "medium" })}>{r.name}</div><div className={css({ fontSize: "xs", color: "fg.muted" })}>{r.category} · {rupees(r.priceCents)}</div></TableCell>
                  <TableCell><StatusPill status={r.infoStatus} />{r.missing.length > 0 && <div className={css({ fontSize: "xs", color: "fg.muted", marginTop: "1" })}>{r.missing.length} still missing</div>}</TableCell>
                  <TableCell><StatusPill status={statusOf(r)} /></TableCell>
                  <TableCell className={css({ fontSize: "sm" })}>{code(r)}</TableCell>
                  <TableCell><Button size="sm" variant="outline" onClick={open_(r.productId)}>Open</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className={css({ display: { base: "flex", md: "none" }, flexDirection: "column", gap: "2" })}>
          {shown.map((r) => (
            <button key={r.productId} type="button" onClick={open_(r.productId)} className={css({ textAlign: "left", border: "1px solid", borderColor: "border.subtle", borderRadius: "lg", padding: "3", display: "flex", flexDirection: "column", gap: "1.5", background: "bg.canvas" })}>
              <strong>{r.name}</strong>
              <span className={css({ fontSize: "xs", color: "fg.muted" })}>{r.category} · {rupees(r.priceCents)} · {code(r)}</span>
              <span className={rowStyle}><StatusPill status={r.infoStatus} /><StatusPill status={statusOf(r)} /></span>
            </button>
          ))}
        </div>
        {shown.length === 0 && <Hint>Nothing matches that filter.</Hint>}
      </Section>

      <Section title="On the live shop, not yet in this catalog" hint="Seen on the live site earlier; the live catalog itself has not been read. Export it from production and import it, then these can be classified like the rest.">
        {data.pending.filter((p) => p.status === "PENDING_IMPORT").length === 0 ? <Hint>Nothing pending.</Hint> : (
          <ul className={css({ display: "flex", flexDirection: "column", gap: "1.5", fontSize: "sm" })}>
            {data.pending.filter((p) => p.status === "PENDING_IMPORT").map((p) => <li key={p.id}><strong>{p.name}</strong> <span className={css({ color: "fg.muted" })}>({p.kind === "PRODUCT" ? `product${p.categoryName ? `, ${p.categoryName}` : ""}` : "category"}) — {p.note}</span></li>)}
          </ul>
        )}
      </Section>

      <ProductEditor productId={open} hsn={data.hsn} onClose={() => setOpen(null)} onChanged={reload} />
    </div>
  );
}
