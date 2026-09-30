"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { css } from "styled-system/css";
import type { PieceFilter, Selector } from "@/modules/promotions/contracts";
import { chipRow, field, grid2, hint, pill } from "./editor.styles";
import { MoneyInput } from "./MoneyInput";

export interface CatalogOptions {
  categories: Array<{ id: string; name: string }>;
  collections: Array<{ id: string; name: string }>;
  products: Array<{ id: string; name: string; priceCents: number }>;
  materials: string[];
  colors: string[];
  sizes: string[];
}

type ListType = "categories" | "collections" | "products";
type ValueType = "materials" | "colors" | "sizes";

function idsOf(list: Selector[], type: ListType): string[] {
  const s = list.find((x) => x.type === type) as { ids: string[] } | undefined;
  return s?.ids ?? [];
}
function valuesOf(list: Selector[], type: ValueType): string[] {
  const s = list.find((x) => x.type === type) as { values: string[] } | undefined;
  return s?.values ?? [];
}
function withIds(list: Selector[], type: ListType, ids: string[]): Selector[] {
  const rest = list.filter((x) => x.type !== type);
  return ids.length ? [...rest, { type, ids } as Selector] : rest;
}
function withValues(list: Selector[], type: ValueType, values: string[]): Selector[] {
  const rest = list.filter((x) => x.type !== type);
  return values.length ? [...rest, { type, values } as Selector] : rest;
}
const toggle = (list: string[], value: string) =>
  list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

const sectionLabel = css({ fontSize: "xs", fontWeight: "semibold", letterSpacing: "0.06em", textTransform: "uppercase", color: "fg.muted" });
const results = css({ display: "flex", flexDirection: "column", maxHeight: "48", overflowY: "auto", border: "1px solid", borderColor: "border.subtle", borderRadius: "lg" });
const resultRow = css({ display: "flex", justifyContent: "space-between", gap: "3", paddingInline: "3", paddingBlock: "2", fontSize: "sm", textAlign: "left", cursor: "pointer", background: "transparent", _hover: { background: "bg.canvas" } });
const chosenChip = css({ display: "inline-flex", alignItems: "center", gap: "1", borderRadius: "full", background: "gold.50", border: "1px solid", borderColor: "gold.200", paddingInline: "2.5", paddingBlock: "0.5", fontSize: "sm", _dark: { background: "bg.canvas", borderColor: "gold.700" } });

function ProductPicker({ chosen, options, onChange, idPrefix }: { chosen: string[]; options: CatalogOptions; onChange: (ids: string[]) => void; idPrefix: string }) {
  const [query, setQuery] = useState("");
  const byId = useMemo(() => new Map(options.products.map((p) => [p.id, p])), [options.products]);
  const found = query.trim()
    ? options.products.filter((p) => !chosen.includes(p.id) && p.name.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 8)
    : [];
  return (
    <div className={field}>
      <Input id={`${idPrefix}-product-search`} placeholder="Search pieces by name…" value={query} onChange={(e) => setQuery(e.target.value)} />
      {found.length > 0 && (
        <div className={results}>
          {found.map((p) => (
            <button key={p.id} type="button" className={resultRow} onClick={() => { onChange([...chosen, p.id]); setQuery(""); }}>
              <span>{p.name}</span>
              <span className={hint}>₹{(p.priceCents / 100).toLocaleString("en-IN")}</span>
            </button>
          ))}
        </div>
      )}
      {chosen.length > 0 && (
        <div className={chipRow}>
          {chosen.map((id) => (
            <span key={id} className={chosenChip}>
              {byId.get(id)?.name ?? "Removed piece"}
              <button type="button" aria-label="Remove" onClick={() => onChange(chosen.filter((c) => c !== id))} className={css({ cursor: "pointer", display: "inline-flex" })}>
                <X className={css({ width: "3.5", height: "3.5" })} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function PillGroup({ label, values, chosen, onChange }: { label: string; values: Array<{ key: string; label: string }>; chosen: string[]; onChange: (next: string[]) => void }) {
  if (values.length === 0) return null;
  return (
    <div className={field}>
      <span className={sectionLabel}>{label}</span>
      <div className={chipRow}>
        {values.map((v) => (
          <button key={v.key} type="button" aria-pressed={chosen.includes(v.key)} className={pill(chosen.includes(v.key))} onClick={() => onChange(toggle(chosen, v.key))}>
            {v.label}
          </button>
        ))}
      </div>
    </div>
  );
}

const groupBox = css({ display: "flex", flexDirection: "column", gap: "4", borderRadius: "lg", border: "1px solid", borderColor: "border.subtle", padding: "3" });
const groupHead = css({ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "2" });
const named = (list: Array<{ id: string; name: string }>) => list.map((x) => ({ key: x.id, label: x.name }));
const plain = (list: string[]) => list.map((x) => ({ key: x, label: x }));

/** One group of pieces: where they come from, then what narrows them. */
function GroupFields({ group, onChange, options, idPrefix }: { group: Selector[]; onChange: (next: Selector[]) => void; options: CatalogOptions; idPrefix: string }) {
  const price = group.find((s) => s.type === "priceRange") as { minCents?: number | null; maxCents?: number | null } | undefined;
  const setPrice = (minCents: number | null, maxCents: number | null) => {
    const rest = group.filter((s) => s.type !== "priceRange");
    onChange(minCents === null && maxCents === null ? rest : [...rest, { type: "priceRange", minCents, maxCents }]);
  };
  const missing = [
    options.colors.length === 0 && "colour",
    options.materials.length === 0 && "material",
  ].filter(Boolean);
  return (
    <>
      <PillGroup label="Categories" values={named(options.categories)} chosen={idsOf(group, "categories")} onChange={(ids) => onChange(withIds(group, "categories", ids))} />
      <PillGroup label="Collections" values={named(options.collections)} chosen={idsOf(group, "collections")} onChange={(ids) => onChange(withIds(group, "collections", ids))} />
      <div className={field}>
        <span className={sectionLabel}>Specific pieces</span>
        <ProductPicker idPrefix={`${idPrefix}-inc`} chosen={idsOf(group, "products")} options={options} onChange={(ids) => onChange(withIds(group, "products", ids))} />
      </div>
      <PillGroup label="Material" values={plain(options.materials)} chosen={valuesOf(group, "materials")} onChange={(v) => onChange(withValues(group, "materials", v))} />
      <PillGroup label="Colour" values={plain(options.colors)} chosen={valuesOf(group, "colors")} onChange={(v) => onChange(withValues(group, "colors", v))} />
      <PillGroup label="Size" values={plain(options.sizes)} chosen={valuesOf(group, "sizes")} onChange={(v) => onChange(withValues(group, "sizes", v))} />
      <div className={field}>
        <span className={sectionLabel}>Price</span>
        <div className={grid2}>
          <div className={field}>
            <Label htmlFor={`${idPrefix}-min`}>From</Label>
            <MoneyInput id={`${idPrefix}-min`} value={price?.minCents ?? null} onChange={(v) => setPrice(v, price?.maxCents ?? null)} placeholder="Any" />
          </div>
          <div className={field}>
            <Label htmlFor={`${idPrefix}-max`}>Up to</Label>
            <MoneyInput id={`${idPrefix}-max`} value={price?.maxCents ?? null} onChange={(v) => setPrice(price?.minCents ?? null, v)} placeholder="Any" />
          </div>
        </div>
      </div>
      {missing.length > 0 && (
        <p className={hint}>
          No piece has a {missing.join(" or ")} recorded yet, so {missing.length > 1 ? "they" : "it"} can&rsquo;t be chosen here. Add it on the piece in Products and it appears.
        </p>
      )}
    </>
  );
}

/**
 * Which pieces count. Inside a group, categories, collections and named
 * pieces mean "any of these" and material, colour, size and price narrow
 * them. Further groups add more pieces with their own narrowing — "earrings
 * at ₹200–₹400, or black necklaces under ₹600". Except takes pieces out.
 */
export function PieceFilterEditor({ value, onChange, options, idPrefix, allowEvery = true }: { value: PieceFilter; onChange: (next: PieceFilter) => void; options: CatalogOptions; idPrefix: string; allowEvery?: boolean }) {
  const extra = value.or ?? [];
  const every = value.include.length === 0 && extra.length === 0;
  const [open, setOpen] = useState(!every || !allowEvery);
  const exc = value.exclude;
  const groups = [value.include, ...extra];
  const setGroup = (index: number, next: Selector[]) =>
    onChange(index === 0 ? { ...value, include: next } : { ...value, or: extra.map((g, i) => (i === index - 1 ? next : g)) });
  const removeGroup = (index: number) => {
    if (index === 0) onChange({ ...value, include: extra[0] ?? [], or: extra.slice(1) });
    else onChange({ ...value, or: extra.filter((_, i) => i !== index - 1) });
  };

  return (
    <div className={css({ display: "flex", flexDirection: "column", gap: "4" })}>
      {allowEvery && (
        <div className={chipRow}>
          <button type="button" className={pill(!open)} aria-pressed={!open} onClick={() => { setOpen(false); onChange({ include: [], exclude: exc }); }}>
            Every piece
          </button>
          <button type="button" className={pill(open)} aria-pressed={open} onClick={() => setOpen(true)}>
            Chosen pieces
          </button>
        </div>
      )}
      {open && (
        <>
          {groups.map((group, index) => (
            <div key={index} className={groups.length > 1 ? groupBox : css({ display: "flex", flexDirection: "column", gap: "4" })}>
              {groups.length > 1 && (
                <div className={groupHead}>
                  <span className={sectionLabel}>{index === 0 ? "Group 1" : `Or group ${index + 1}`}</span>
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeGroup(index)}>
                    <Trash2 className={css({ width: "3.5", height: "3.5" })} /> Remove group
                  </Button>
                </div>
              )}
              <GroupFields group={group} options={options} idPrefix={`${idPrefix}-g${index}`} onChange={(next) => setGroup(index, next)} />
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => onChange({ ...value, or: [...extra, []] })}>
            <Plus className={css({ width: "4", height: "4" })} /> Add another group of pieces
          </Button>
          <p className={hint}>
            Inside a group, categories, collections and named pieces mean “any of these”; material,
            colour, size and price narrow them. A piece counts if it fits any group.
          </p>
        </>
      )}
      <div className={field}>
        <span className={sectionLabel}>Except</span>
        <ProductPicker idPrefix={`${idPrefix}-exc`} chosen={idsOf(exc, "products")} options={options} onChange={(ids) => onChange({ ...value, exclude: withIds(exc, "products", ids) })} />
      </div>
    </div>
  );
}
