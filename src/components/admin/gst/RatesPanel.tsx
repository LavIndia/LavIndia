"use client";

import { useState } from "react";
import { toast } from "sonner";
import { css } from "styled-system/css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { send, shortDate, useGst } from "./gst-client";
import { Hint, Notice, Section, StatusPill, fieldStyle, gridStyle, pageStyle, rowStyle, scrollX } from "./gst-ui";

interface Rate { id: string; code: string; codeKind: string; rateBps: number; cgstBps: number; sgstBps: number; igstBps: number; effectiveFrom: string; effectiveTo: string | null; minUnitValueCents: number | null; maxUnitValueCents: number | null; approval: string; approvedBy: string | null; used: boolean; notification: { number: string; verifiedBy: string | null } | null; notes: string | null }
interface Code { id: string; code: string; description: string }
interface Notification { id: string; number: string; title: string | null; issuedOn: string | null; effectiveFrom: string | null; sourceUrl: string | null; verifiedBy: string | null; verifiedAt: string | null; notes: string | null }
interface Masters { hsn: Code[]; sac: Code[]; rates: Rate[]; notifications: Notification[] }

const pct = (bps: number) => `${bps / 100}%`;

/**
 * The rate master. A rate is only approved when the notification it rests on
 * has been verified by a person against the official text, and a new version
 * closes the old one the day before — an old version is never edited.
 */
export function RatesPanel() {
  const { data, error, reload } = useGst<Masters>("/api/admin/gst/masters");
  const [busy, setBusy] = useState(false);
  const [approving, setApproving] = useState<Rate | null>(null);
  const [approver, setApprover] = useState("");
  const [rate, setRate] = useState({ codeId: "", percent: "", from: "", notificationId: "", notes: "" });
  const [code, setCode] = useState({ kind: "HSN", code: "", description: "" });
  const [note, setNote] = useState({ number: "", issuedOn: "", effectiveFrom: "", title: "", sourceUrl: "" });
  const [verifier, setVerifier] = useState<Record<string, string>>({});

  if (error) return <Notice tone="bad">{error}</Notice>;
  if (!data) return <Hint>Loading…</Hint>;

  async function run(body: object, done: string, after?: () => void) {
    setBusy(true);
    try { await send("/api/admin/gst/masters", "POST", body); toast.success(done); after?.(); await reload(); } catch (e) { toast.error(e instanceof Error ? e.message : "Could not save"); } finally { setBusy(false); }
  }
  const codes = [...data.hsn.map((c) => ({ ...c, kind: "HSN" })), ...data.sac.map((c) => ({ ...c, kind: "SAC" }))];

  return (
    <div className={pageStyle}>
      <Notice>The rates seeded here are <strong>candidates</strong> read from Notification 9/2025 and are all <strong>Draft</strong>. Nothing uses a draft rate. A rate becomes usable only when it cites a notification that someone has verified against the official text, and is then approved by name.</Notice>
      <Tabs defaultValue="rates" className={css({ display: "flex", flexDirection: "column", gap: "4" })}>
        <TabsList>
          <TabsTrigger value="rates">Rates</TabsTrigger>
          <TabsTrigger value="codes">HSN &amp; SAC codes</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="rates">
          <div className={pageStyle}>
            <Section title="Rate versions">
              <div className={scrollX}>
                <Table>
                  <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Rate</TableHead><TableHead>Valid</TableHead><TableHead>Source</TableHead><TableHead>Status</TableHead><TableHead /></TableRow></TableHeader>
                  <TableBody>
                    {data.rates.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell><strong>{r.codeKind} {r.code}</strong>{(r.minUnitValueCents !== null || r.maxUnitValueCents !== null) && <div className={css({ fontSize: "xs", color: "fg.muted" })}>value band applies</div>}</TableCell>
                        <TableCell>{pct(r.rateBps)}<div className={css({ fontSize: "xs", color: "fg.muted" })}>CGST {pct(r.cgstBps)} · SGST {pct(r.sgstBps)} · IGST {pct(r.igstBps)}</div></TableCell>
                        <TableCell className={css({ fontSize: "sm" })}>{shortDate(r.effectiveFrom)} → {r.effectiveTo ? shortDate(r.effectiveTo) : "now"}</TableCell>
                        <TableCell className={css({ fontSize: "sm" })}>{r.notification ? <>{r.notification.number}<div className={css({ fontSize: "xs", color: r.notification.verifiedBy ? "green.700" : "red.600" })}>{r.notification.verifiedBy ? "verified" : "not verified"}</div></> : "none cited"}</TableCell>
                        <TableCell><StatusPill status={r.approval} />{r.used && <div className={css({ fontSize: "xs", color: "fg.muted" })}>used — locked</div>}</TableCell>
                        <TableCell>{r.approval === "DRAFT" && <Button size="sm" variant="outline" onClick={() => setApproving(r)}>Approve…</Button>}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Section>

            <Section title="Draft a new rate version" hint="Always saved as a draft. The central and state halves are equal, so the rate must be even in basis points (3% is fine, 2.55% is not).">
              <div className={gridStyle}>
                <div className={fieldStyle}><Label htmlFor="rt-code">Code</Label><Select value={rate.codeId} onValueChange={(v) => setRate({ ...rate, codeId: v })}><SelectTrigger id="rt-code"><SelectValue placeholder="Choose" /></SelectTrigger><SelectContent>{codes.map((c) => <SelectItem key={c.id} value={`${c.kind}:${c.id}`}>{c.kind} {c.code} — {c.description.slice(0, 50)}</SelectItem>)}</SelectContent></Select></div>
                <div className={fieldStyle}><Label htmlFor="rt-pct">Total rate (%)</Label><Input id="rt-pct" inputMode="decimal" value={rate.percent} onChange={(e) => setRate({ ...rate, percent: e.target.value })} /></div>
                <div className={fieldStyle}><Label htmlFor="rt-from">Applies from</Label><Input id="rt-from" type="date" value={rate.from} onChange={(e) => setRate({ ...rate, from: e.target.value })} /></div>
                <div className={fieldStyle}><Label htmlFor="rt-note">Notification it rests on</Label><Select value={rate.notificationId} onValueChange={(v) => setRate({ ...rate, notificationId: v })}><SelectTrigger id="rt-note"><SelectValue placeholder="Choose" /></SelectTrigger><SelectContent>{data.notifications.map((n) => <SelectItem key={n.id} value={n.id}>{n.number}{n.verifiedBy ? "" : " (not verified)"}</SelectItem>)}</SelectContent></Select></div>
              </div>
              <div className={fieldStyle}><Label htmlFor="rt-notes">Notes</Label><Textarea id="rt-notes" value={rate.notes} onChange={(e) => setRate({ ...rate, notes: e.target.value })} /></div>
              <Button disabled={busy || !rate.codeId || !rate.percent || !rate.from} className={css({ alignSelf: "flex-start" })} onClick={() => { const [kind, id] = rate.codeId.split(":"); void run({ action: "draftRate", hsnId: kind === "HSN" ? id : null, sacId: kind === "SAC" ? id : null, rateBps: Math.round(Number(rate.percent) * 100), effectiveFrom: rate.from, notificationId: rate.notificationId || null, notes: rate.notes || null }, "Draft saved", () => setRate({ codeId: "", percent: "", from: "", notificationId: "", notes: "" })); }}>Save draft</Button>
            </Section>
          </div>
        </TabsContent>

        <TabsContent value="codes">
          <div className={pageStyle}>
            <Section title="Codes">
              <div className={scrollX}>
                <Table><TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Tariff description</TableHead></TableRow></TableHeader>
                  <TableBody>{codes.map((c) => <TableRow key={c.kind + c.id}><TableCell><strong>{c.kind} {c.code}</strong></TableCell><TableCell className={css({ fontSize: "sm" })}>{c.description}</TableCell></TableRow>)}</TableBody></Table>
              </div>
            </Section>
            <Section title="Add or correct a code" hint="An HSN is 2, 4, 6 or 8 digits; a SAC is 4 or 6 digits starting 99. Copy the description from the tariff.">
              <div className={gridStyle}>
                <div className={fieldStyle}><Label htmlFor="cd-kind">Kind</Label><Select value={code.kind} onValueChange={(v) => setCode({ ...code, kind: v })}><SelectTrigger id="cd-kind"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="HSN">HSN (goods)</SelectItem><SelectItem value="SAC">SAC (services)</SelectItem></SelectContent></Select></div>
                <div className={fieldStyle}><Label htmlFor="cd-code">Code</Label><Input id="cd-code" inputMode="numeric" value={code.code} onChange={(e) => setCode({ ...code, code: e.target.value })} /></div>
              </div>
              <div className={fieldStyle}><Label htmlFor="cd-desc">Tariff description</Label><Textarea id="cd-desc" value={code.description} onChange={(e) => setCode({ ...code, description: e.target.value })} /></div>
              <Button disabled={busy || !code.code || !code.description} className={css({ alignSelf: "flex-start" })} onClick={() => run({ action: "code", ...code }, "Saved", () => setCode({ kind: "HSN", code: "", description: "" }))}>Save code</Button>
            </Section>
          </div>
        </TabsContent>

        <TabsContent value="notifications">
          <div className={pageStyle}>
            <Section title="Notifications" hint="Verifying records that a person compared the notification with the official text. A rate cannot be approved on an unverified one.">
              {data.notifications.map((n) => (
                <div key={n.id} className={css({ border: "1px solid", borderColor: "border.subtle", borderRadius: "lg", padding: "3", display: "flex", flexDirection: "column", gap: "1.5" })}>
                  <div className={rowStyle}><strong>{n.number}</strong><span className={css({ fontSize: "sm", color: "fg.muted" })}>{shortDate(n.issuedOn)}{n.effectiveFrom ? ` · effective ${shortDate(n.effectiveFrom)}` : ""}</span>{n.verifiedBy ? <StatusPill status="VERIFIED" /> : <StatusPill status="MISSING" />}</div>
                  {n.title && <div className={css({ fontSize: "sm" })}>{n.title}</div>}
                  {n.sourceUrl && <a href={n.sourceUrl} target="_blank" rel="noreferrer" className={css({ fontSize: "xs", textDecoration: "underline", overflowWrap: "anywhere" })}>{n.sourceUrl}</a>}
                  {n.notes && <Hint>{n.notes}</Hint>}
                  {n.verifiedBy ? <Hint>Verified by {n.verifiedBy} on {shortDate(n.verifiedAt)}</Hint> : (
                    <div className={rowStyle}><Input aria-label="Who verified it" className={css({ maxWidth: "16rem" })} placeholder="Name of who checked it" value={verifier[n.id] ?? ""} onChange={(e) => setVerifier({ ...verifier, [n.id]: e.target.value })} /><Button size="sm" variant="outline" disabled={busy || !(verifier[n.id] ?? "").trim()} onClick={() => run({ action: "verifyNotification", id: n.id, verifiedBy: verifier[n.id] }, "Marked verified")}>Mark verified</Button></div>
                  )}
                </div>
              ))}
            </Section>
            <Section title="Add a notification">
              <div className={gridStyle}>
                <div className={fieldStyle}><Label htmlFor="nt-no">Number</Label><Input id="nt-no" value={note.number} onChange={(e) => setNote({ ...note, number: e.target.value })} placeholder="e.g. 9/2025-Central Tax (Rate)" /></div>
                <div className={fieldStyle}><Label htmlFor="nt-link">Official link (https)</Label><Input id="nt-link" value={note.sourceUrl} onChange={(e) => setNote({ ...note, sourceUrl: e.target.value })} /></div>
                <div className={fieldStyle}><Label htmlFor="nt-on">Dated</Label><Input id="nt-on" type="date" value={note.issuedOn} onChange={(e) => setNote({ ...note, issuedOn: e.target.value })} /></div>
                <div className={fieldStyle}><Label htmlFor="nt-eff">In force from</Label><Input id="nt-eff" type="date" value={note.effectiveFrom} onChange={(e) => setNote({ ...note, effectiveFrom: e.target.value })} /></div>
              </div>
              <div className={fieldStyle}><Label htmlFor="nt-title">What it does</Label><Input id="nt-title" value={note.title} onChange={(e) => setNote({ ...note, title: e.target.value })} /></div>
              <Button disabled={busy || !note.number} className={css({ alignSelf: "flex-start" })} onClick={() => run({ action: "notification", number: note.number, issuedOn: note.issuedOn || null, effectiveFrom: note.effectiveFrom || null, title: note.title || null, sourceUrl: note.sourceUrl || null }, "Added", () => setNote({ number: "", issuedOn: "", effectiveFrom: "", title: "", sourceUrl: "" }))}>Add notification</Button>
            </Section>
          </div>
        </TabsContent>
      </Tabs>

      {approving && (
        <div role="dialog" aria-modal="true" aria-label="Approve a rate" className={css({ position: "fixed", inset: "0", background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: "4" })}>
          <div className={css({ background: "bg.surface", borderRadius: "xl", padding: "5", maxWidth: "28rem", width: "full", display: "flex", flexDirection: "column", gap: "3" })}>
            <h3 className={css({ fontFamily: "display", fontSize: "lg", fontWeight: "semibold" })}>Approve {approving.codeKind} {approving.code} at {pct(approving.rateBps)}?</h3>
            {!approving.notification?.verifiedBy ? <Notice tone="warn">{approving.notification ? `Notification ${approving.notification.number} has not been verified against the official text.` : "This rate cites no notification."} It cannot be approved yet.</Notice> : <Hint>Approving makes this rate usable from {shortDate(approving.effectiveFrom)} and closes the version it replaces the day before.</Hint>}
            <div className={fieldStyle}><Label htmlFor="ap-name">Approver&apos;s name</Label><Input id="ap-name" value={approver} onChange={(e) => setApprover(e.target.value)} /></div>
            <div className={rowStyle}>
              <Button disabled={busy || !approver.trim() || !approving.notification?.verifiedBy} onClick={() => run({ action: "approveRate", id: approving.id, approverName: approver }, "Rate approved", () => { setApproving(null); setApprover(""); })}>Approve</Button>
              <Button variant="outline" onClick={() => setApproving(null)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
