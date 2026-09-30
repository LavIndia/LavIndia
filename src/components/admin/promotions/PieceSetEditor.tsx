"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { css } from "styled-system/css";
import type { PieceField, PieceRule } from "@/modules/promotions/contracts";
import { chipRow, field, hint, pill } from "./editor.styles";
import { FIELD_LABEL, PieceRuleRow, newRule, ruleIsComplete } from "./PieceRuleRow";
import { ProductPicker, type CatalogOptions } from "./ProductPicker";

export interface PieceSetDraft {
  id?: string;
  name: string;
  description: string | null;
  match: "ALL" | "ANY";
  rules: PieceRule[];
  includeProductIds: string[];
  excludeProductIds: string[];
}

export const emptySet = (): PieceSetDraft => ({
  name: "",
  description: null,
  match: "ALL",
  rules: [newRule("category")],
  includeProductIds: [],
  excludeProductIds: [],
});

interface Preview {
  count: number;
  notOnline: number;
  missingProducts: number;
  products: Array<{ productId: string; name: string; imageUrl: string | null; minCents: number; maxCents: number; online: boolean }>;
}

const grid = css({ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(7.5rem, 1fr))", gap: "3" });
const tile = css({ display: "flex", flexDirection: "column", gap: "1", fontSize: "xs", minWidth: 0 });
const thumb = css({ position: "relative", aspectRatio: "1", borderRadius: "md", overflow: "hidden", background: "bg.canvas", maxWidth: "100%" });
const sectionLabel = css({ fontSize: "xs", fontWeight: "semibold", letterSpacing: "0.06em", textTransform: "uppercase", color: "fg.muted" });
const rupee = (c: number) => `₹${(c / 100).toLocaleString("en-IN")}`;

/** Checks the set against the catalog as it is edited. */
function useSetPreview(draft: PieceSetDraft) {
  const [preview, setPreview] = useState<Preview | null>(null);
  const key = JSON.stringify([draft.match, draft.rules, draft.includeProductIds, draft.excludeProductIds]);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/admin/piece-sets/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({ input: { ...draft, name: draft.name || "Draft" } }),
        });
        if (res.ok) setPreview(await res.json());
      } catch {
        // A superseded preview is dropped.
      }
    }, 300);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return preview;
}

/**
 * A named group of pieces, built from simple rows — "Category is Earrings",
 * "Price is under ₹400", "Tag is festive edit" — with pieces that are always
 * in or never in, and the matching pieces shown as they change.
 */
export function PieceSetEditor({
  initial,
  options,
  usedByLive = [],
  onSaved,
  onCancel,
}: {
  initial: PieceSetDraft;
  options: CatalogOptions;
  usedByLive?: string[];
  onSaved: (set: { id: string; name: string }) => void;
  onCancel?: () => void;
}) {
  const [draft, setDraft] = useState<PieceSetDraft>(initial);
  const [saving, setSaving] = useState(false);
  const preview = useSetPreview(draft);
  const set = (patch: Partial<PieceSetDraft>) => setDraft((d) => ({ ...d, ...patch }));
  const hideField = (f: PieceField) =>
    (f === "colour" && !options.colors.length) || (f === "material" && !options.materials.length) || (f === "size" && !options.sizes.length);

  const save = async () => {
    if (!draft.name.trim()) {
      toast.error("Give the set a name");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(draft.id ? `/api/admin/piece-sets/${draft.id}` : "/api/admin/piece-sets", {
        method: draft.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...draft,
          // Rows left without a value say nothing; they are dropped rather than saved.
          rules: draft.rules.filter(ruleIsComplete),
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Could not save the set");
      toast.success(draft.id ? "Set saved" : "Set created");
      onSaved({ id: body.set.id, name: body.set.name });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save the set");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={css({ display: "flex", flexDirection: "column", gap: "5" })}>
      {usedByLive.length > 0 && (
        <p className={css({ fontSize: "sm", borderRadius: "lg", background: "gold.50", border: "1px solid", borderColor: "gold.200", padding: "3", _dark: { background: "bg.surface", borderColor: "gold.700" } })}>
          Used by {usedByLive.length} running offer{usedByLive.length === 1 ? "" : "s"} ({usedByLive.join(", ")}). Changes apply to {usedByLive.length === 1 ? "it" : "them"} straight away; orders already placed keep their prices.
        </p>
      )}
      <div className={field}>
        <Label htmlFor="set-name">Name</Label>
        <Input id="set-name" value={draft.name} placeholder="Festive earrings" onChange={(e) => set({ name: e.target.value })} />
      </div>

      <div className={field}>
        <span className={sectionLabel}>Pieces that match</span>
        <div className={chipRow}>
          <button type="button" className={pill(draft.match === "ALL")} aria-pressed={draft.match === "ALL"} onClick={() => set({ match: "ALL" })}>all of these</button>
          <button type="button" className={pill(draft.match === "ANY")} aria-pressed={draft.match === "ANY"} onClick={() => set({ match: "ANY" })}>any of these</button>
        </div>
        <div className={css({ display: "flex", flexDirection: "column", gap: "2" })}>
          {draft.rules.map((rule, i) => (
            <PieceRuleRow
              key={i}
              id={`rule-${i}`}
              rule={rule}
              options={options}
              onChange={(r) => set({ rules: draft.rules.map((x, j) => (j === i ? r : x)) })}
              onRemove={() => set({ rules: draft.rules.filter((_, j) => j !== i) })}
            />
          ))}
        </div>
        <div className={chipRow}>
          {(Object.keys(FIELD_LABEL) as PieceField[]).filter((f) => !hideField(f)).map((f) => (
            <Button key={f} type="button" variant="outline" size="sm" onClick={() => set({ rules: [...draft.rules, newRule(f)] })}>
              <Plus className={css({ width: "3.5", height: "3.5" })} /> {FIELD_LABEL[f]}
            </Button>
          ))}
        </div>
      </div>

      <div className={field}>
        <span className={sectionLabel}>Always include</span>
        <ProductPicker id="set-include" chosen={draft.includeProductIds} products={options.products} onChange={(ids) => set({ includeProductIds: ids })} />
      </div>
      <div className={field}>
        <span className={sectionLabel}>Never include</span>
        <ProductPicker id="set-exclude" chosen={draft.excludeProductIds} products={options.products} onChange={(ids) => set({ excludeProductIds: ids })} />
      </div>

      <div className={field}>
        <span className={sectionLabel}>
          {preview ? `${preview.count} piece${preview.count === 1 ? "" : "s"} in this set` : "Checking…"}
        </span>
        {preview && preview.notOnline > 0 && <p className={hint}>{preview.notOnline} of them {preview.notOnline === 1 ? "isn't" : "aren't"} on sale online (draft or retired) — {preview.notOnline === 1 ? "it" : "they"} still count in store.</p>}
        {preview && preview.missingProducts > 0 && <p className={hint}>{preview.missingProducts} chosen piece{preview.missingProducts === 1 ? " has" : "s have"} since been removed from the catalog.</p>}
        {preview && preview.count === 0 && <p className={hint}>No pieces match yet. An offer using an empty set simply won&rsquo;t apply.</p>}
        {preview && preview.count > 0 && (
          <div className={grid}>
            {preview.products.map((p) => (
              <div key={p.productId} className={tile}>
                <div className={thumb}>
                  {p.imageUrl && <Image src={p.imageUrl} alt="" fill sizes="8rem" className={css({ objectFit: "cover" })} />}
                </div>
                <span className={css({ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" })}>{p.name}</span>
                <span className={hint}>{p.minCents === p.maxCents ? rupee(p.minCents) : `${rupee(p.minCents)}–${rupee(p.maxCents)}`}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={css({ display: "flex", gap: "2", justifyContent: "flex-end" })}>
        {onCancel && <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>Cancel</Button>}
        <Button type="button" onClick={save} disabled={saving}>
          {saving && <Loader2 className={css({ width: "4", height: "4", animation: "spin" })} />}
          {draft.id ? "Save set" : "Create set"}
        </Button>
      </div>
    </div>
  );
}
