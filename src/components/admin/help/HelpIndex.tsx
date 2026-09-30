"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { css } from "styled-system/css";
import { ADMIN_HELP, HELP_AREAS, type HelpEntry } from "@/content/admin-help";
import { HelpContent } from "./HelpContent";

const card = css({ borderRadius: "xl", border: "1px solid", borderColor: "border.subtle", background: "bg.surface" });
const summary = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "3",
  padding: "4",
  cursor: "pointer",
  listStyle: "none",
  "&::-webkit-details-marker": { display: "none" },
});

function matches(entry: HelpEntry, q: string): boolean {
  if (!q) return true;
  const text = [
    entry.title,
    entry.purpose,
    ...(entry.steps ?? []),
    ...(entry.notes ?? []),
    ...(entry.sections ?? []).flatMap((s) => [s.heading, ...s.items.flatMap((i) => [i.term, i.text])]),
  ]
    .join(" ")
    .toLowerCase();
  return q.toLowerCase().split(/\s+/).every((word) => text.includes(word));
}

/** Every screen's help, grouped as the sidebar is, with search across all of it. */
export function HelpIndex() {
  const [query, setQuery] = useState("");
  const shown = useMemo(() => ADMIN_HELP.filter((e) => matches(e, query.trim())), [query]);

  return (
    <div className={css({ display: "flex", flexDirection: "column", gap: "6" })}>
      <Input
        id="help-search"
        placeholder="Search the help — e.g. retire, GST, unique codes, stock"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {shown.length === 0 && <p className={css({ color: "fg.muted" })}>Nothing in the help mentions that yet.</p>}
      {HELP_AREAS.map((area) => {
        const entries = shown.filter((e) => e.area === area);
        if (entries.length === 0) return null;
        return (
          <section key={area} className={css({ display: "flex", flexDirection: "column", gap: "3" })}>
            <h2 className={css({ fontSize: "xs", fontWeight: "semibold", letterSpacing: "0.08em", textTransform: "uppercase", color: "fg.muted" })}>
              {area}
            </h2>
            {entries.map((entry) => (
              <details key={entry.route} className={card} open={Boolean(query.trim()) && entries.length <= 3}>
                <summary className={summary}>
                  <span className={css({ display: "flex", flexDirection: "column", gap: "0.5", minWidth: 0 })}>
                    <span className={css({ fontWeight: "semibold", fontSize: "md" })}>{entry.title}</span>
                    <span className={css({ fontSize: "sm", color: "fg.muted" })}>{entry.purpose}</span>
                  </span>
                  <ChevronDown className={css({ width: "4", height: "4", flexShrink: 0 })} aria-hidden />
                </summary>
                <div className={css({ paddingInline: "4", paddingBottom: "5" })}>
                  <HelpContent entry={entry} />
                </div>
              </details>
            ))}
          </section>
        );
      })}
    </div>
  );
}
