"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { css } from "styled-system/css";
import { describeBenefit, describeCondition, headline, type NameLookup } from "@/modules/promotions/summarise";
import { type Draft, toPayload } from "./promotion-draft";

export interface CheckResult {
  errors: string[];
  warnings: string[];
  matchCount: number;
  noCostCount: number;
}

const list = css({ display: "flex", flexDirection: "column", gap: "1.5", fontSize: "sm", color: "fg.default", paddingLeft: "0", listStyle: "none" });
const issue = css({ display: "flex", gap: "2", alignItems: "flex-start", fontSize: "sm" });
const icon = css({ width: "4", height: "4", flexShrink: 0, marginTop: "0.5" });

function when(draft: Draft): string {
  const fmt = (v: string) => new Date(v).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  const start = draft.startsAt ? fmt(draft.startsAt) : "now";
  const window = draft.isRecurring && draft.recurrenceStartTime && draft.recurrenceEndTime
    ? `, ${draft.recurrenceStartTime}–${draft.recurrenceEndTime}${draft.recurrenceType === "WEEKLY" ? " on chosen days" : ""}`
    : "";
  return `${draft.endsAt ? `${start} → ${fmt(draft.endsAt)}` : `From ${start}, no end date`}${window}`;
}

/** Re-checks the draft on the server as it changes, without saving. */
export function useDraftCheck(draft: Draft, selfId?: string) {
  const [result, setResult] = useState<CheckResult | null>(null);
  const key = JSON.stringify(draft);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/admin/promotions/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({ input: toPayload(draft), selfId }),
        });
        if (res.ok) setResult(await res.json());
      } catch {
        // A superseded check is simply dropped.
      }
    }, 400);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, selfId]);
  return result;
}

/** The offer in plain words, with what would stop it or is worth knowing. */
export function PromotionSummary({ draft, names, check }: { draft: Draft; names: NameLookup; check: CheckResult | null }) {
  const title = draft.title || headline(draft.benefit);
  return (
    <div className={css({ display: "flex", flexDirection: "column", gap: "4" })}>
      <div>
        <p className={css({ fontFamily: "display", fontSize: "xl", fontWeight: "semibold", color: "fg.default" })}>{title}</p>
        {draft.trigger === "CODE" && (
          <p className={css({ fontFamily: "mono", fontSize: "sm", color: "fg.muted" })}>Code {draft.code || "— not set"}</p>
        )}
      </div>
      <ul className={list}>
        <li>{describeBenefit(draft.benefit, draft.pieces, names)}</li>
        {draft.conditions.map((c) => (
          <li key={c.type}>{describeCondition(c)}</li>
        ))}
        <li>{draft.channels.length === 2 ? "Online and in store" : draft.channels[0] === "ONLINE" ? "Online only" : "In store only"}</li>
        <li>{when(draft)}</li>
        <li>
          {draft.exclusive
            ? "Exclusive — no other offer applies with it"
            : draft.combinesWithOtherClasses
              ? "Combines with other kinds of offer"
              : "Doesn't combine with other kinds of offer"}
        </li>
      </ul>

      {check && (
        <div className={css({ display: "flex", flexDirection: "column", gap: "2", borderTop: "1px solid", borderColor: "border.subtle", paddingTop: "3" })}>
          <p className={css({ fontSize: "sm", fontWeight: "medium" })}>
            {check.matchCount} piece{check.matchCount === 1 ? "" : "s"} match
          </p>
          {check.errors.map((e) => (
            <div key={e} className={issue} style={{ color: "var(--colors-danger)" }}>
              <XCircle className={icon} aria-hidden /> <span>{e}</span>
            </div>
          ))}
          {check.warnings.map((w) => (
            <div key={w} className={css({ display: "flex", gap: "2", alignItems: "flex-start", fontSize: "sm", color: "gold.700", _dark: { color: "gold.200" } })}>
              <AlertTriangle className={icon} aria-hidden /> <span>{w}</span>
            </div>
          ))}
          {check.errors.length === 0 && (
            <div className={issue} style={{ color: "var(--colors-success)" }}>
              <CheckCircle2 className={icon} aria-hidden /> <span>Ready to activate</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
