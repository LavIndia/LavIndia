"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { css } from "styled-system/css";
import type { PieceField, PieceRule } from "@/modules/promotions/contracts";
import { chipRow, hint, inlineMoney, pill, sentence } from "./editor.styles";
import { MoneyInput } from "./MoneyInput";
import { ProductPicker, type CatalogOptions } from "./ProductPicker";

export const FIELD_LABEL: Record<PieceField, string> = {
  category: "Category",
  collection: "Collection",
  product: "Piece",
  tag: "Tag",
  price: "Price",
  colour: "Colour",
  material: "Material",
  size: "Size",
};

/** A fresh row for a field, with the operator that reads most naturally. */
export function newRule(field: PieceField): PieceRule {
  return field === "price" ? { field, op: "under", maxCents: null } : { field, op: "is", values: [] };
}

const tagText = (t: string) => t.replace(/-/g, " ");
const normalise = (t: string) => t.trim().toLowerCase().replace(/[\s_]+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-").replace(/^-|-$/g, "");
const row = css({ display: "flex", flexDirection: "column", gap: "2", borderRadius: "lg", border: "1px solid", borderColor: "border.subtle", padding: "3" });

function Values({ rule, options, onChange, id }: { rule: PieceRule; options: CatalogOptions; onChange: (values: string[]) => void; id: string }) {
  const [draftTag, setDraftTag] = useState("");
  const chosen = rule.values ?? [];
  const toggle = (v: string) => onChange(chosen.includes(v) ? chosen.filter((x) => x !== v) : [...chosen, v]);
  const pills = (list: Array<{ key: string; label: string }>) => (
    <div className={chipRow}>
      {list.map((v) => (
        <button key={v.key} type="button" className={pill(chosen.includes(v.key))} aria-pressed={chosen.includes(v.key)} onClick={() => toggle(v.key)}>
          {v.label}
        </button>
      ))}
    </div>
  );

  switch (rule.field) {
    case "category":
      return pills(options.categories.map((c) => ({ key: c.id, label: c.name })));
    case "collection":
      return pills(options.collections.map((c) => ({ key: c.id, label: c.name })));
    case "product":
      return <ProductPicker id={`${id}-product`} chosen={chosen} products={options.products} onChange={onChange} />;
    case "colour":
    case "material":
    case "size": {
      const list = rule.field === "colour" ? options.colors : rule.field === "material" ? options.materials : options.sizes;
      return list.length ? pills(list.map((v) => ({ key: v, label: v }))) : <p className={hint}>No piece has a {FIELD_LABEL[rule.field].toLowerCase()} recorded yet. Add it on the piece in Products.</p>;
    }
    case "tag": {
      const all = [...new Set([...options.tags, ...chosen])];
      return (
        <div className={css({ display: "flex", flexDirection: "column", gap: "2" })}>
          {all.length > 0 && pills(all.map((t) => ({ key: t, label: tagText(t) })))}
          <div className={sentence}>
            <Input
              id={`${id}-tag`}
              className={css({ maxWidth: "56" })}
              placeholder="Type a tag and press Enter"
              value={draftTag}
              onChange={(e) => setDraftTag(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                e.preventDefault();
                const t = normalise(draftTag);
                if (t && !chosen.includes(t)) onChange([...chosen, t]);
                setDraftTag("");
              }}
            />
          </div>
          {options.tags.length === 0 && <p className={hint}>No pieces are tagged yet — tag them in Products, singly or several at once.</p>}
        </div>
      );
    }
    default:
      return null;
  }
}

/** One row: "Category is Earrings", "Price is under ₹600", "Tag is not clearance". */
export function PieceRuleRow({ rule, onChange, onRemove, options, id }: { rule: PieceRule; onChange: (r: PieceRule) => void; onRemove: () => void; options: CatalogOptions; id: string }) {
  const isPrice = rule.field === "price";
  return (
    <div className={row}>
      <div className={sentence}>
        <Select value={rule.field} onValueChange={(f) => onChange(newRule(f as PieceField))}>
          <SelectTrigger className={css({ width: "36" })} aria-label="What to check">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(FIELD_LABEL) as PieceField[]).map((f) => (
              <SelectItem key={f} value={f}>{FIELD_LABEL[f]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={rule.op} onValueChange={(op) => onChange({ ...rule, op: op as PieceRule["op"] })}>
          <SelectTrigger className={css({ width: "32" })} aria-label="How">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {isPrice ? (
              <>
                <SelectItem value="under">is under</SelectItem>
                <SelectItem value="over">is over</SelectItem>
                <SelectItem value="between">is between</SelectItem>
              </>
            ) : (
              <>
                <SelectItem value="is">is</SelectItem>
                <SelectItem value="isNot">is not</SelectItem>
              </>
            )}
          </SelectContent>
        </Select>
        {isPrice && rule.op !== "under" && (
          <MoneyInput id={`${id}-min`} ariaLabel="From" className={inlineMoney} value={rule.minCents ?? null} onChange={(v) => onChange({ ...rule, minCents: v })} />
        )}
        {isPrice && rule.op === "between" && <span>and</span>}
        {isPrice && rule.op !== "over" && (
          <MoneyInput id={`${id}-max`} ariaLabel="Up to" className={inlineMoney} value={rule.maxCents ?? null} onChange={(v) => onChange({ ...rule, maxCents: v })} />
        )}
        <Button type="button" variant="ghost" size="icon" aria-label="Remove this condition" onClick={onRemove} className={css({ marginLeft: "auto" })}>
          <Trash2 className={css({ width: "4", height: "4" })} />
        </Button>
      </div>
      {!isPrice && <Values rule={rule} options={options} id={id} onChange={(values) => onChange({ ...rule, values })} />}
    </div>
  );
}
