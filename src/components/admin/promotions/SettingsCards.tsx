"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { RecurrenceScheduleFields } from "@/components/admin/shared/RecurrenceScheduleFields";
import { chipRow, field, grid2, hint, pill, toggleRow } from "./editor.styles";
import type { Draft, DraftPatch } from "./promotion-draft";

type CardProps = { draft: Draft; set: (patch: DraftPatch) => void };

const CHANNELS = [
  { key: "ONLINE", label: "Online" },
  { key: "STORE", label: "In store" },
] as const;

/** Name, how it is applied, and where. */
export function BasicsFields({ draft, set }: CardProps) {
  return (
    <>
      <div className={field}>
        <Label htmlFor="promo-name">Internal name</Label>
        <Input id="promo-name" value={draft.name} onChange={(e) => set({ name: e.target.value })} placeholder="Diwali Earring Trio 2026" />
        <p className={hint}>Only your team sees this.</p>
      </div>
      <div className={field}>
        <Label>How it applies</Label>
        <div className={chipRow}>
          <button type="button" className={pill(draft.trigger === "AUTOMATIC")} aria-pressed={draft.trigger === "AUTOMATIC"} onClick={() => set({ trigger: "AUTOMATIC" })}>
            Automatically
          </button>
          <button type="button" className={pill(draft.trigger === "CODE")} aria-pressed={draft.trigger === "CODE"} onClick={() => set({ trigger: "CODE" })}>
            With a code
          </button>
        </div>
      </div>
      {draft.trigger === "CODE" && (
        <div className={field}>
          <Label htmlFor="promo-code">Code</Label>
          <Input
            id="promo-code"
            value={draft.code ?? ""}
            onChange={(e) => set({ code: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, "") || null })}
            placeholder="FESTIVE10"
          />
        </div>
      )}
      <div className={field}>
        <Label>Where</Label>
        <div className={chipRow}>
          {CHANNELS.map((c) => {
            const on = draft.channels.includes(c.key);
            return (
              <button
                key={c.key}
                type="button"
                className={pill(on)}
                aria-pressed={on}
                onClick={() => {
                  const next = on ? draft.channels.filter((x) => x !== c.key) : [...draft.channels, c.key];
                  if (next.length) set({ channels: next });
                }}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </div>
      <div className={field}>
        <Label htmlFor="promo-notes">Notes for the team</Label>
        <Textarea id="promo-notes" rows={2} value={draft.description ?? ""} onChange={(e) => set({ description: e.target.value || null })} />
      </div>
    </>
  );
}

/** When the offer runs, including repeating windows. */
export function ScheduleFields({ draft, set }: CardProps) {
  return (
    <>
      <div className={grid2}>
        <div className={field}>
          <Label htmlFor="promo-start">Starts</Label>
          <Input id="promo-start" type="datetime-local" value={draft.startsAt} onChange={(e) => set({ startsAt: e.target.value })} />
        </div>
        <div className={field}>
          <Label htmlFor="promo-end">Ends</Label>
          <Input id="promo-end" type="datetime-local" value={draft.endsAt} onChange={(e) => set({ endsAt: e.target.value })} />
          <p className={hint}>Leave empty to run until you end it.</p>
        </div>
      </div>
      <RecurrenceScheduleFields
        description="Times are Indian Standard Time."
        value={{
          isRecurring: draft.isRecurring,
          recurrenceType: draft.recurrenceType ?? "DAILY",
          recurrenceDaysOfWeek: draft.recurrenceDaysOfWeek,
          recurrenceDayOfMonth: draft.recurrenceDayOfMonth ?? 1,
          recurrenceStartTime: draft.recurrenceStartTime ?? "",
          recurrenceEndTime: draft.recurrenceEndTime ?? "",
        }}
        onChange={(v) =>
          set({
            isRecurring: v.isRecurring,
            recurrenceType: v.recurrenceType as Draft["recurrenceType"],
            recurrenceDaysOfWeek: v.recurrenceDaysOfWeek,
            recurrenceDayOfMonth: v.recurrenceType === "MONTHLY" ? v.recurrenceDayOfMonth : null,
            recurrenceStartTime: v.recurrenceStartTime || null,
            recurrenceEndTime: v.recurrenceEndTime || null,
          })
        }
      />
    </>
  );
}

/** How this offer plays with the others. */
export function CombiningFields({ draft, set }: CardProps) {
  return (
    <>
      <div className={toggleRow}>
        <div>
          <Label htmlFor="promo-combine">Can be combined with other kinds of offer</Label>
          <p className={hint}>
            A price offer on pieces with a code or spend offer on the order. Both offers must allow it.
          </p>
        </div>
        <Switch id="promo-combine" checked={draft.combinesWithOtherClasses} onCheckedChange={(v) => set({ combinesWithOtherClasses: v })} />
      </div>
      <div className={toggleRow}>
        <div>
          <Label htmlFor="promo-exclusive">Exclusive</Label>
          <p className={hint}>When this applies, no other offer does — even one that would save the client more.</p>
        </div>
        <Switch id="promo-exclusive" checked={draft.exclusive} onCheckedChange={(v) => set({ exclusive: v })} />
      </div>
      <p className={hint}>
        When offers cover the same pieces, each piece goes to one offer, and the client gets whichever
        combination saves them most.
      </p>
    </>
  );
}
