"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { css } from "styled-system/css";
import { chipRow, field, hint } from "./editor.styles";

export interface CatalogOptions {
  categories: Array<{ id: string; name: string }>;
  collections: Array<{ id: string; name: string }>;
  products: Array<{ id: string; name: string; priceCents: number }>;
  materials: string[];
  colors: string[];
  sizes: string[];
  tags: string[];
}

const results = css({ display: "flex", flexDirection: "column", maxHeight: "48", overflowY: "auto", border: "1px solid", borderColor: "border.subtle", borderRadius: "lg" });
const resultRow = css({ display: "flex", justifyContent: "space-between", gap: "3", paddingInline: "3", paddingBlock: "2", fontSize: "sm", textAlign: "left", cursor: "pointer", background: "transparent", _hover: { background: "bg.canvas" } });
export const chosenChip = css({ display: "inline-flex", alignItems: "center", gap: "1", borderRadius: "full", background: "gold.50", border: "1px solid", borderColor: "gold.200", paddingInline: "2.5", paddingBlock: "0.5", fontSize: "sm", _dark: { background: "bg.canvas", borderColor: "gold.700" } });

/** Search pieces by name and collect them as chips. */
export function ProductPicker({
  chosen,
  products,
  onChange,
  id,
  placeholder = "Search pieces by name…",
}: {
  chosen: string[];
  products: CatalogOptions["products"];
  onChange: (ids: string[]) => void;
  id: string;
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const found = query.trim()
    ? products
        .filter((p) => !chosen.includes(p.id) && p.name.toLowerCase().includes(query.trim().toLowerCase()))
        .slice(0, 8)
    : [];
  return (
    <div className={field}>
      <Input id={id} placeholder={placeholder} value={query} onChange={(e) => setQuery(e.target.value)} />
      {query.trim() && found.length === 0 && <p className={hint}>No piece by that name.</p>}
      {found.length > 0 && (
        <div className={results}>
          {found.map((p) => (
            <button
              key={p.id}
              type="button"
              className={resultRow}
              onClick={() => {
                onChange([...chosen, p.id]);
                setQuery("");
              }}
            >
              <span>{p.name}</span>
              <span className={hint}>₹{(p.priceCents / 100).toLocaleString("en-IN")}</span>
            </button>
          ))}
        </div>
      )}
      {chosen.length > 0 && (
        <div className={chipRow}>
          {chosen.map((pid) => (
            <span key={pid} className={chosenChip}>
              {byId.get(pid)?.name ?? "A removed piece"}
              <button
                type="button"
                aria-label={`Remove ${byId.get(pid)?.name ?? "piece"}`}
                onClick={() => onChange(chosen.filter((c) => c !== pid))}
                className={css({ cursor: "pointer", display: "inline-flex" })}
              >
                <X className={css({ width: "3.5", height: "3.5" })} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
