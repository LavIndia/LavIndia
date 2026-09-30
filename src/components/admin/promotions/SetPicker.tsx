"use client";

import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { css } from "styled-system/css";
import { chipRow, hint, pill } from "./editor.styles";
import { PieceSetEditor, emptySet, type PieceSetDraft } from "./PieceSetEditor";
import { chosenChip, type CatalogOptions } from "./ProductPicker";

export interface SetOption {
  id: string;
  name: string;
  /** "proposed": suggested by "Describe your offer", not created yet. */
  kind: "all" | "category" | "collection" | "saved" | "proposed";
  /** For a proposed set, the rows it would be created with. */
  proposal?: PieceSetDraft;
}

const proposedChip = css({
  display: "inline-flex",
  alignItems: "center",
  gap: "2",
  borderRadius: "full",
  border: "1px dashed",
  borderColor: "gold.500",
  paddingInline: "3",
  paddingBlock: "1",
  fontSize: "sm",
});

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
  created = {},
  id,
}: {
  value: string[];
  onChange: (ids: string[]) => void;
  sets: SetOption[];
  onSetCreated: (set: SetOption, replaces?: string) => void;
  options: CatalogOptions;
  allowAll?: boolean;
  /** Pieces chosen some other way (by name), so "Every piece" is not what applies. */
  otherChoices?: boolean;
  /** Called when "Every piece" is chosen, to clear choices made elsewhere. */
  onEvery?: () => void;
  /** Proposed set id → the set created for it, from any picker in the offer. */
  created?: Record<string, string>;
  id: string;
}) {
  // The set being made in the drawer, and the proposed set it replaces.
  const [creating, setCreating] = useState<{ draft: PieceSetDraft; replaces: string | null } | null>(null);
  const byId = new Map(sets.map((s) => [s.id, s]));
  const isAll = value.length === 0 && !otherChoices;
  // A proposed set created elsewhere in this offer is used here too.
  useEffect(() => {
    if (value.some((v) => created[v])) onChange([...new Set(value.map((v) => created[v] ?? v))]);
  }, [value, created, onChange]);
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
        {value.map((setId) => {
          const option = byId.get(setId);
          if (option?.kind === "proposed" && option.proposal) {
            const proposal = option.proposal;
            return (
              <span key={setId} className={proposedChip}>
                <span>
                  {option.name}
                  <span className={css({ color: "fg.muted" })}> · Not created yet</span>
                </span>
                <Button type="button" size="sm" variant="outline" onClick={() => setCreating({ draft: proposal, replaces: setId })}>
                  Create set
                </Button>
                <button type="button" aria-label="Remove set" onClick={() => onChange(value.filter((v) => v !== setId))} className={css({ cursor: "pointer", display: "inline-flex" })}>
                  <X className={css({ width: "3.5", height: "3.5" })} />
                </button>
              </span>
            );
          }
          return (
          <span key={setId} className={chosenChip}>
            {option?.name ?? "A removed set"}
            <button type="button" aria-label="Remove set" onClick={() => onChange(value.filter((v) => v !== setId))} className={css({ cursor: "pointer", display: "inline-flex" })}>
              <X className={css({ width: "3.5", height: "3.5" })} />
            </button>
          </span>
          );
        })}
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
        <Button type="button" variant="outline" size="sm" onClick={() => setCreating({ draft: emptySet(), replaces: null })}>
          <Plus className={css({ width: "4", height: "4" })} /> New set of pieces
        </Button>
        <p className={css({ fontSize: "xs", color: "fg.muted", marginTop: "1" })}>
          For example “Earrings under ₹400” or “Tag is festive edit”. Saved sets can be reused in any offer.
        </p>
      </div>

      <Sheet open={creating !== null} onOpenChange={(open) => !open && setCreating(null)}>
        <SheetContent side="right" className={css({ width: "full", maxWidth: "40rem", overflowY: "auto" })}>
          <SheetHeader>
            <SheetTitle>New set of pieces</SheetTitle>
            <SheetDescription>Build it once; use it in this offer and any other.</SheetDescription>
          </SheetHeader>
          <div className={css({ paddingInline: "4", paddingBottom: "6" })} id={`${id}-new-set`}>
            {creating && (
              <PieceSetEditor
                initial={creating.draft}
                options={options}
                onCancel={() => setCreating(null)}
                onSaved={(saved) => {
                  const option: SetOption = { id: saved.id, name: saved.name, kind: "saved" };
                  const replaces = creating.replaces;
                  onSetCreated(option, replaces ?? undefined);
                  onChange(replaces ? value.map((v) => (v === replaces ? saved.id : v)) : [...value, saved.id]);
                  setCreating(null);
                }}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
