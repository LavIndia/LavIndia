"use client";

import { useRef, useState } from "react";
import { parse } from "papaparse";
import { Download, FileSpreadsheet, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { css } from "styled-system/css";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { LookupResult } from "./useVariantLookup";

const wrapStyle = css({ display: "flex", flexDirection: "column", gap: "2" });
const rowStyle = css({ display: "flex", flexWrap: "wrap", gap: "2" });
const hintStyle = css({ fontSize: "xs", color: "fg.muted", lineHeight: "1.5" });
const problemStyle = css({ fontSize: "xs", color: "danger", lineHeight: "1.5" });
const linkStyle = css({ color: "accent.pressed", textDecoration: "underline", textUnderlineOffset: "3px" });

const TEMPLATE = `sku,quantity,unitCost
SAMPLE-NECK-001,10,650.00
SAMPLE-RING-001,5,300.00
`;

interface Props {
  locationId?: string;
  onLine: (variant: LookupResult, quantity: number, unitCost?: string) => void;
}

/**
 * Fills the delivery list from the supplier's list or invoice as a CSV.
 *
 * Columns: sku (or barcode), quantity, unitCost (₹ per unit, optional). Rows
 * are matched to existing pieces only — receiving never creates a product, so
 * anything unmatched is reported with the reminder to add it in Products
 * first. Nothing is booked here; the lines land in the list for review.
 */
export function ReceiveCsvImport({ locationId, onLine }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [problems, setProblems] = useState<string[]>([]);

  const downloadTemplate = () => {
    const url = URL.createObjectURL(new Blob([TEMPLATE], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "receive-stock-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFile = (file: File) => {
    setBusy(true);
    setProblems([]);
    parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase(),
      complete: async (results) => {
        try {
          const issues: string[] = [];
          const rows = results.data.map((row, i) => {
            const code = (row.sku || row.barcode || "").trim();
            const quantity = Number((row.quantity || "").trim());
            const line = i + 2;
            if (!code) issues.push(`Row ${line}: no sku or barcode`);
            else if (!Number.isInteger(quantity) || quantity <= 0)
              issues.push(`Row ${line} (${code}): quantity must be a whole number of 1 or more`);
            else return { code, quantity, unitCost: (row.unitcost || "").trim() || undefined, line };
            return null;
          });
          const valid = rows.filter((r): r is NonNullable<typeof r> => r !== null);

          const response = await fetch("/api/admin/inventory/lookup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ codes: valid.map((r) => r.code), locationId }),
          });
          if (!response.ok) throw new Error("lookup failed");
          const { results: found } = (await response.json()) as { results: LookupResult[] };

          const byCode = new Map<string, LookupResult>();
          for (const v of found) {
            if (v.sku) byCode.set(v.sku.toLowerCase(), v);
            if (v.barcode) byCode.set(v.barcode.toLowerCase(), v);
          }

          let added = 0;
          for (const r of valid) {
            const variant = byCode.get(r.code.toLowerCase());
            if (!variant) {
              issues.push(`Row ${r.line}: “${r.code}” is not in Products yet`);
            } else if (!variant.isActive) {
              issues.push(`Row ${r.line}: “${r.code}” is not active`);
            } else {
              onLine(variant, r.quantity, r.unitCost);
              added += 1;
            }
          }
          setProblems(issues);
          if (added > 0) toast.success(`${added} ${added === 1 ? "line" : "lines"} added — review, then Receive stock`);
          else toast.error("No rows could be added");
        } catch {
          toast.error("Could not read that file");
        } finally {
          setBusy(false);
          if (inputRef.current) inputRef.current.value = "";
        }
      },
      error: () => {
        toast.error("Failed to parse CSV file");
        setBusy(false);
      },
    });
  };

  return (
    <div className={wrapStyle}>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv,text/comma-separated-values,application/csv,application/vnd.ms-excel,text/plain"
        className={css({ srOnly: true })}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      <div className={rowStyle}>
        <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={busy}>
          {busy ? (
            <Loader2 className={css({ height: "4", width: "4", animation: "spin 1s linear infinite" })} />
          ) : (
            <FileSpreadsheet className={css({ height: "4", width: "4" })} />
          )}
          Add from CSV
        </Button>
        <Button variant="ghost" size="sm" onClick={downloadTemplate}>
          <Download className={css({ height: "4", width: "4" })} />
          Template
        </Button>
      </div>
      <p className={hintStyle}>
        Columns: sku (or barcode), quantity, unitCost (₹ per unit, optional). Pieces not yet in
        Products are skipped — add them first in{" "}
        <Link href="/admin/products/bulk-upload" className={linkStyle}>
          Bulk upload
        </Link>{" "}
        with a quantity column and you will land back here with them listed.
      </p>
      {problems.length > 0 && (
        <ul className={problemStyle}>
          {problems.slice(0, 15).map((p) => (
            <li key={p}>{p}</li>
          ))}
          {problems.length > 15 && <li>…and {problems.length - 15} more</li>}
        </ul>
      )}
    </div>
  );
}
