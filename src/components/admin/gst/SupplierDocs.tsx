"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { css } from "styled-system/css";
import { Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { send, shortDate } from "./gst-client";
import { Hint, fieldStyle, gridStyle, rowStyle } from "./gst-ui";

export interface SupplierDoc {
  id: string;
  supplierName: string;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  fileName: string;
  sizeBytes: number;
  createdAt: string;
}

const kb = (bytes: number) => (bytes > 1_000_000 ? `${(bytes / 1_000_000).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1000))} KB`);

/**
 * Supplier invoices kept as evidence for a product's classification. What a
 * supplier printed as the HSN is a hint about how they classified the goods,
 * not proof — it is kept so the accountant can see it.
 */
export function SupplierDocs({ productId, documents, onChanged }: { productId: string; documents: SupplierDoc[]; onChanged: () => void }) {
  const file = useRef<HTMLInputElement>(null);
  const [fields, setFields] = useState({ supplierName: "", invoiceNumber: "", invoiceDate: "" });
  const [busy, setBusy] = useState(false);

  async function upload() {
    const chosen = file.current?.files?.[0];
    if (!chosen) return toast.error("Choose a PDF, JPEG or PNG first");
    setBusy(true);
    try {
      const form = new FormData();
      form.set("file", chosen);
      form.set("productIds", productId);
      for (const [k, v] of Object.entries(fields)) form.set(k, v);
      const response = await fetch("/api/admin/gst/documents", { method: "POST", body: form });
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Could not upload");
      toast.success("Kept as evidence");
      setFields({ supplierName: fields.supplierName, invoiceNumber: "", invoiceDate: "" });
      if (file.current) file.current.value = "";
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not upload");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={css({ display: "flex", flexDirection: "column", gap: "3" })}>
      {documents.length === 0 ? (
        <Hint>No supplier papers kept for this piece yet.</Hint>
      ) : (
        <ul className={css({ display: "flex", flexDirection: "column", gap: "1.5" })}>
          {documents.map((d) => (
            <li key={d.id} className={css({ display: "flex", justifyContent: "space-between", gap: "2", fontSize: "sm", alignItems: "center" })}>
              <span className={css({ minWidth: 0, overflowWrap: "anywhere" })}>
                {d.supplierName}{d.invoiceNumber ? ` · ${d.invoiceNumber}` : ""}{d.invoiceDate ? ` · ${shortDate(d.invoiceDate)}` : ""}
                <span className={css({ color: "fg.muted" })}> — {d.fileName} ({kb(d.sizeBytes)})</span>
              </span>
              <span className={rowStyle}>
                <Button variant="ghost" size="icon" asChild aria-label={`Download ${d.fileName}`}><a href={`/api/admin/gst/documents/${d.id}`}><Download className={css({ height: "4", width: "4" })} /></a></Button>
                <Button variant="ghost" size="icon" aria-label={`Remove ${d.fileName}`} onClick={async () => { if (!confirm("Remove this document?")) return; try { await send(`/api/admin/gst/documents/${d.id}`, "DELETE"); onChanged(); } catch (e) { toast.error(e instanceof Error ? e.message : "Could not remove"); } }}><Trash2 className={css({ height: "4", width: "4", color: "danger" })} /></Button>
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className={gridStyle}>
        <div className={fieldStyle}><Label htmlFor="sd-supplier">Supplier</Label><Input id="sd-supplier" value={fields.supplierName} onChange={(e) => setFields({ ...fields, supplierName: e.target.value })} /></div>
        <div className={fieldStyle}><Label htmlFor="sd-no">Their invoice number</Label><Input id="sd-no" value={fields.invoiceNumber} onChange={(e) => setFields({ ...fields, invoiceNumber: e.target.value })} /></div>
        <div className={fieldStyle}><Label htmlFor="sd-date">Invoice date</Label><Input id="sd-date" type="date" value={fields.invoiceDate} onChange={(e) => setFields({ ...fields, invoiceDate: e.target.value })} /></div>
        <div className={fieldStyle}><Label htmlFor="sd-file">File (PDF, JPEG or PNG, up to 5 MB)</Label><input id="sd-file" ref={file} type="file" accept="application/pdf,image/jpeg,image/png" /></div>
      </div>
      <Button variant="outline" disabled={busy || !fields.supplierName.trim()} onClick={upload} className={css({ alignSelf: "flex-start" })}>Keep this paper</Button>
    </div>
  );
}
