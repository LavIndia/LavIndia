"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { css } from "styled-system/css";
import { chipRow, hint, pill } from "./editor.styles";
import { PieceSetEditor, emptySet } from "./PieceSetEditor";
import { chosenChip, type CatalogOptions } from "./ProductPicker";

export interface SetOption {
  id: string;
  name: string;
  kind: "all" | "category" | "collection" | "saved";
}

const groupLabel = css({ fontSize: "xs", fontWeight: "semibold", letterSpacing: "0.06em", textTransform: "uppercase", color: "fg.muted" });

/**
 * Which pieces an offer covers, as a choice of Piece Sets. Several sets mean
 * "any of these". A set that does not exist yet is made in a drawer without
 * leaving the offer.
 */
export function SetPicker({
  value,
  onChange,
  sets,
  onSetCreated,
  options,
  allowAll = true,
  otherChoices = false,
  onEvery,
  id,
}: {
  value: string[];
  onChange: (ids: string[]) => void;
  sets: SetOption[];
  onSetCreated: (set: SetOption) => void;
  options: CatalogOptions;
  allowAll?: boolean;
  /** Pieces chosen some other way (by name), so "Every piece" is not what applies. */
  otherChoices?: boolean;
  /** Called when "Every piece" is chosen, to clear choices made elsewhere. */
  onEvery?: () => void;
  id: string;
}) {
  const [creating, setCreating] = useState(false);
  const byId = new Map(sets.map((s) => [s.id, s]));
  const isAll = value.length === 0 && !otherChoices;
  const add = (setId: string) => onChange(value.includes(setId) ? value : [...value.filter((v) => v !== "all"), setId]);
  const groups: Array<{ label: string; kind: SetOption["kind"] }> = [
    { label: "Your sets", kind: "saved" },
    { label: "Categories", kind: "category" },
    { label: "Collections", kind: "collection" },
  ];

  return (
    <div className={css({ display: "flex", flexDirection: "column", gap: "4" })}>
      <div className={chipRow}>
        {allowAll && (
          <button type="button" className={pill(isAll)} aria-pressed={isAll} onClick={() => (onEvery ? onEvery() : onChange([]))}>
            Every piece
          </button>
        )}
        {value.map((setId) => (
          <span key={setId} className={chosenChip}>
            {byId.get(setId)?.name ?? "A removed set"}
            <button type="button" aria-label="Remove set" onClick={() => onChange(value.filter((v) => v !== setId))} className={css({ cursor: "pointer", display: "inline-flex" })}>
              <X className={css({ width: "3.5", height: "3.5" })} />
            </button>
          </span>
        ))}
      </div>
      {value.length > 1 && <p className={hint}>A piece counts if it is in any of these.</p>}

      {groups.map((g) => {
        const list = sets.filter((s) => s.kind === g.kind && !value.includes(s.id));
        if (list.length === 0) return null;
        return (
          <div key={g.kind} className={css({ display: "flex", flexDirection: "column", gap: "2" })}>
            <span className={groupLabel}>{g.label}</span>
            <div className={chipRow}>
              {list.map((s) => (
                <button key={s.id} type="button" className={pill(false)} onClick={() => add(s.id)}>
                  <Plus className={css({ width: "3", height: "3", display: "inline", marginRight: "1" })} />
                  {s.name}
                </button>
              ))}
            </div>
          </div>
        );
      })}

      <div>
        <Button type="button" variant="outline" size="sm" onClick={() => setCreating(true)}>
          <Plus className={css({ width: "4", height: "4" })} /> New set of pieces
        </Button>
        <p className={css({ fontSize: "xs", color: "fg.muted", marginTop: "1" })}>
          For example “Earrings under ₹400” or “Tag is festive edit”. Saved sets can be reused in any offer.
        </p>
      </div>

      <Sheet open={creating} onOpenChange={setCreating}>
        <SheetContent side="right" className={css({ width: "full", maxWidth: "40rem", overflowY: "auto" })}>
          <SheetHeader>
            <SheetTitle>New set of pieces</SheetTitle>
            <SheetDescription>Build it once; use it in this offer and any other.</SheetDescription>
          </SheetHeader>
          <div className={css({ paddingInline: "4", paddingBottom: "6" })} id={`${id}-new-set`}>
            {creating && (
              <PieceSetEditor
                initial={emptySet()}
                options={options}
                onCancel={() => setCreating(false)}
                onSaved={(saved) => {
                  const option: SetOption = { id: saved.id, name: saved.name, kind: "saved" };
                  onSetCreated(option);
                  onChange([...value, saved.id]);
                  setCreating(false);
                }}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
