"use client";

import { useState } from "react";
import { toast } from "sonner";
import { css } from "styled-system/css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { send, shortDate, useGst } from "./gst-client";
import { Hint, Notice, Section, StatusPill, fieldStyle, gridStyle, pageStyle, rowStyle } from "./gst-ui";

interface Proposal { id: string; title: string; status: string; summary: string | null; sourceUrl: string | null; noticeDate: string | null; effectiveFrom: string | null; proposedChange: { code: string; codeKind: string; description: string; rateBps: number }; reviewedBy: string | null; reviewNote: string | null; notification: { number: string } | null }
interface Watch { id: string; label: string; url: string; lastCheckedAt: string | null; lastStatus: string | null; lastChangedAt: string | null; changeAcknowledgedAt: string | null }
interface Data { proposals: Proposal[]; watches: Watch[]; officialHosts: string[] }

/**
 * Keeping up with notifications. Watching a page only notices that it changed,
 * so a person reads it; a proposal holds a change someone has spotted until it
 * is reviewed, and accepting one creates a DRAFT rate, never an approved one.
 */
export function UpdatesPanel() {
  const { data, error, reload } = useGst<Data>("/api/admin/gst/updates");
  const [watch, setWatch] = useState({ label: "", url: "" });
  const [p, setP] = useState({ title: "", code: "", kind: "HSN", description: "", percent: "", from: "", source: "", summary: "" });
  const [reviewer, setReviewer] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  if (error) return <Notice tone="bad">{error}</Notice>;
  if (!data) return <Hint>Loading…</Hint>;

  async function run(body: object, done: string, after?: () => void) {
    setBusy(true);
    try { await send("/api/admin/gst/updates", "POST", body); toast.success(done); after?.(); await reload(); } catch (e) { toast.error(e instanceof Error ? e.message : "Could not do that"); } finally { setBusy(false); }
  }

  return (
    <div className={pageStyle}>
      <Notice>Nothing here publishes a rate. A change you spot is recorded with its source and dates, reviewed by a named person, and — if accepted — becomes a <strong>draft</strong> rate that still has to be approved on the Rates screen against a verified notification.</Notice>

      <Section title="Official pages being watched" hint={`Only official https pages can be watched (${data.officialHosts.join(", ")}). Checking fetches the page once and notes whether it changed; it never reads or applies what it says.`}>
        {data.watches.length === 0 && <Hint>No pages watched yet.</Hint>}
        {data.watches.map((w) => {
          const unread = w.lastChangedAt && !w.changeAcknowledgedAt;
          return (
            <div key={w.id} className={css({ border: "1px solid", borderColor: unread ? "gold.400" : "border.subtle", borderRadius: "lg", padding: "3", display: "flex", flexDirection: "column", gap: "1.5" })}>
              <div className={rowStyle}><strong>{w.label}</strong>{unread && <StatusPill status="DIFFERS" />}</div>
              <a href={w.url} target="_blank" rel="noreferrer" className={css({ fontSize: "xs", textDecoration: "underline", overflowWrap: "anywhere" })}>{w.url}</a>
              <Hint>{w.lastCheckedAt ? `Checked ${shortDate(w.lastCheckedAt)}: ${w.lastStatus}` : "Never checked"}{w.lastChangedAt ? ` · changed ${shortDate(w.lastChangedAt)}` : ""}</Hint>
              <div className={rowStyle}>
                <Button size="sm" variant="outline" disabled={busy} onClick={() => run({ action: "checkWatch", id: w.id }, "Checked")}>Check now</Button>
                {unread && <Button size="sm" variant="outline" disabled={busy} onClick={() => run({ action: "acknowledge", id: w.id }, "Marked as read")}>I have read the change</Button>}
              </div>
            </div>
          );
        })}
        <div className={gridStyle}>
          <div className={fieldStyle}><Label htmlFor="w-label">Label</Label><Input id="w-label" value={watch.label} onChange={(e) => setWatch({ ...watch, label: e.target.value })} /></div>
          <div className={fieldStyle}><Label htmlFor="w-url">Address (https)</Label><Input id="w-url" value={watch.url} onChange={(e) => setWatch({ ...watch, url: e.target.value })} /></div>
        </div>
        <Button variant="outline" disabled={busy || !watch.label || !watch.url} className={css({ alignSelf: "flex-start" })} onClick={() => run({ action: "addWatch", ...watch }, "Now watching", () => setWatch({ label: "", url: "" }))}>Watch this page</Button>
      </Section>

      <Section title="Proposed changes">
        {data.proposals.length === 0 && <Hint>No proposed changes.</Hint>}
        {data.proposals.map((x) => (
          <div key={x.id} className={css({ border: "1px solid", borderColor: "border.subtle", borderRadius: "lg", padding: "3", display: "flex", flexDirection: "column", gap: "1.5" })}>
            <div className={rowStyle}><strong>{x.title}</strong><StatusPill status={x.status} /></div>
            <Hint>{x.proposedChange.codeKind} {x.proposedChange.code} → {x.proposedChange.rateBps / 100}%{x.effectiveFrom ? ` from ${shortDate(x.effectiveFrom)}` : ""}{x.notification ? ` · ${x.notification.number}` : ""}{x.noticeDate ? ` · dated ${shortDate(x.noticeDate)}` : ""}</Hint>
            {x.summary && <div className={css({ fontSize: "sm" })}>{x.summary}</div>}
            {x.sourceUrl && <a href={x.sourceUrl} target="_blank" rel="noreferrer" className={css({ fontSize: "xs", textDecoration: "underline", overflowWrap: "anywhere" })}>{x.sourceUrl}</a>}
            {(x.status === "PROPOSED" || x.status === "IN_REVIEW") ? (
              <div className={css({ display: "flex", flexDirection: "column", gap: "2" })}>
                <div className={gridStyle}>
                  <Input aria-label="Reviewer" placeholder="Reviewer's name" value={reviewer} onChange={(e) => setReviewer(e.target.value)} />
                  <Input aria-label="Note" placeholder="Note (needed to reject)" value={note} onChange={(e) => setNote(e.target.value)} />
                </div>
                <div className={rowStyle}>
                  {x.status === "PROPOSED" && <Button size="sm" variant="outline" disabled={busy} onClick={() => run({ action: "review", id: x.id, decision: "IN_REVIEW", reviewer: "" }, "Marked in review")}>Start review</Button>}
                  <Button size="sm" disabled={busy || !reviewer.trim() || !x.effectiveFrom} onClick={() => run({ action: "review", id: x.id, decision: "ACCEPT", reviewer, note: note || null }, "Accepted: a draft rate was created")}>Accept → draft rate</Button>
                  <Button size="sm" variant="outline" disabled={busy || !reviewer.trim() || !note.trim()} onClick={() => run({ action: "review", id: x.id, decision: "REJECT", reviewer, note }, "Rejected")}>Reject</Button>
                </div>
                {!x.effectiveFrom && <Hint>It needs an effective date before it can be accepted.</Hint>}
              </div>
            ) : <Hint>{x.status === "ACCEPTED" ? "Accepted" : "Rejected"} by {x.reviewedBy}{x.reviewNote ? ` — ${x.reviewNote}` : ""}</Hint>}
          </div>
        ))}
      </Section>

      <Section title="Record a proposed change" hint="From a notification you have read. The source and dates are kept with it.">
        <div className={fieldStyle}><Label htmlFor="p-title">Title</Label><Input id="p-title" value={p.title} onChange={(e) => setP({ ...p, title: e.target.value })} /></div>
        <div className={gridStyle}>
          <div className={fieldStyle}><Label htmlFor="p-kind">Kind</Label><Select value={p.kind} onValueChange={(v) => setP({ ...p, kind: v })}><SelectTrigger id="p-kind"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="HSN">HSN</SelectItem><SelectItem value="SAC">SAC</SelectItem></SelectContent></Select></div>
          <div className={fieldStyle}><Label htmlFor="p-code">Code</Label><Input id="p-code" value={p.code} onChange={(e) => setP({ ...p, code: e.target.value })} /></div>
          <div className={fieldStyle}><Label htmlFor="p-pct">New total rate (%)</Label><Input id="p-pct" inputMode="decimal" value={p.percent} onChange={(e) => setP({ ...p, percent: e.target.value })} /></div>
          <div className={fieldStyle}><Label htmlFor="p-from">In force from</Label><Input id="p-from" type="date" value={p.from} onChange={(e) => setP({ ...p, from: e.target.value })} /></div>
        </div>
        <div className={fieldStyle}><Label htmlFor="p-desc">Description in the notification</Label><Input id="p-desc" value={p.description} onChange={(e) => setP({ ...p, description: e.target.value })} /></div>
        <div className={fieldStyle}><Label htmlFor="p-src">Official link (https)</Label><Input id="p-src" value={p.source} onChange={(e) => setP({ ...p, source: e.target.value })} /></div>
        <div className={fieldStyle}><Label htmlFor="p-sum">What it says</Label><Textarea id="p-sum" value={p.summary} onChange={(e) => setP({ ...p, summary: e.target.value })} /></div>
        <Button disabled={busy || !p.title || !p.code || !p.percent || !p.description} className={css({ alignSelf: "flex-start" })} onClick={() => run({ action: "propose", title: p.title, sourceUrl: p.source || null, effectiveFrom: p.from || null, summary: p.summary || null, change: { code: p.code, codeKind: p.kind, description: p.description, rateBps: Math.round(Number(p.percent) * 100) } }, "Recorded", () => setP({ title: "", code: "", kind: "HSN", description: "", percent: "", from: "", source: "", summary: "" }))}>Record it</Button>
      </Section>
    </div>
  );
}
