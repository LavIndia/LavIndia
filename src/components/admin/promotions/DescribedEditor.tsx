"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { css } from "styled-system/css";
import type { DescribedResult } from "@/modules/promotions/describe/to-draft";
import { templateById } from "@/modules/promotions/templates";
import { PromotionEditor } from "./PromotionEditor";
import type { SetOption } from "./SetPicker";
import { DESCRIBED_OFFER_KEY, type Draft, draftFromTemplate } from "./promotion-draft";

type EditorProps = Omit<React.ComponentProps<typeof PromotionEditor>, "initial" | "promotionId" | "status">;

const notesBox = css({
  display: "flex",
  flexDirection: "column",
  gap: "2",
  borderRadius: "lg",
  border: "1px solid",
  borderColor: "gold.200",
  background: "gold.50",
  padding: "4",
  fontSize: "sm",
  lineHeight: "relaxed",
  _dark: { background: "bg.surface", borderColor: "gold.700" },
});

interface Described {
  draft: Draft;
  notes: string[];
  proposed: SetOption[];
}

function readDescribed(): Described | null {
  try {
    const raw = sessionStorage.getItem(DESCRIBED_OFFER_KEY);
    if (!raw) return null;
    const result = JSON.parse(raw) as DescribedResult;
    const template = templateById(result.template);
    if (!template) return null;
    const proposed: SetOption[] = (result.proposedSets ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      kind: "proposed",
      proposal: { name: p.name, description: null, match: p.match, rules: p.rules, includeProductIds: [], excludeProductIds: [] },
    }));
    return { draft: { ...draftFromTemplate(template), ...result.patch } as Draft, notes: result.notes ?? [], proposed };
  } catch {
    return null;
  }
}

/** The editor, opened on the draft "Describe your offer" prepared, with its notes on top. */
export function DescribedEditor(props: EditorProps) {
  const [state, setState] = useState<Described | null | undefined>(undefined);
  useEffect(() => setState(readDescribed()), []);

  if (state === undefined) return null;
  if (state === null) {
    return (
      <div className={css({ display: "flex", flexDirection: "column", gap: "3", alignItems: "flex-start" })}>
        <p className={css({ fontSize: "sm", color: "fg.muted" })}>There is no described offer to open. Describe it again, or pick a kind of offer.</p>
        <Button asChild variant="outline">
          <Link href="/admin/promotions/new">Back to new offer</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className={css({ display: "flex", flexDirection: "column", gap: "4" })}>
      <div className={notesBox} role="note">
        <p className={css({ display: "flex", alignItems: "center", gap: "2", fontWeight: "semibold" })}>
          <Sparkles className={css({ width: "4", height: "4", color: "gold.600" })} aria-hidden />
          Filled in from your description — check every step before saving.
        </p>
        {state.notes.length > 0 && (
          <ul className={css({ listStyle: "disc", paddingLeft: "5", display: "flex", flexDirection: "column", gap: "1" })}>
            {state.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        )}
      </div>
      <PromotionEditor
        initial={state.draft}
        {...props}
        sets={[...state.proposed, ...props.sets]}
        names={{
          ...props.names,
          sets: { ...props.names.sets, ...Object.fromEntries(state.proposed.map((p) => [p.id, `${p.name} (not created yet)`])) },
        }}
      />
    </div>
  );
}
