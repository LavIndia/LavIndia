"use client";

import { useState } from "react";
import { toast } from "sonner";
import { css } from "styled-system/css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { send, shortDate } from "./gst-client";
import { Hint, Notice, StatusPill, fieldStyle, gridStyle, rowStyle } from "./gst-ui";

export interface Mapping { id: string; status: string; hsnId: string | null; effectiveFrom: string; basis: string | null; approvedBy: string | null }
export interface TrailEvent { id: string; action: string; actorName: string | null; approverName: string | null; reason: string | null; createdAt: string }
export interface HsnOption { id: string; code: string; description: string }

const ACTION_TEXT: Record<string, string> = { INFO_SAVED: "Details saved", SUGGESTED: "Suggested", SUBMITTED: "Submitted for approval", APPROVED: "Approved", REJECTED: "Rejected", WITHDRAWN: "Sent back for review" };

/**
 * Submitting a classification, and the accountant's answer to it. Approval
 * names the accountant, who may have no login here; the admin entering it is
 * recorded beside them.
 */
export function ClassificationActions({ productId, mappings, hsn, suggested, complete, onChanged }: { productId: string; mappings: Mapping[]; hsn: HsnOption[]; suggested: string[]; complete: boolean; onChanged: () => void }) {
  const current = mappings[0];
  const [code, setCode] = useState(hsn.find((h) => suggested[0] === h.code)?.id ?? "");
  const [from, setFrom] = useState("");
  const [basis, setBasis] = useState("");
  const [accountant, setAccountant] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function act(body: object, done: string) {
    setBusy(true);
    try { await send(`/api/admin/gst/products/${productId}`, "POST", body); toast.success(done); onChanged(); } catch (e) { toast.error(e instanceof Error ? e.message : "Could not do that"); } finally { setBusy(false); }
  }

  const codeOf = (id: string | null) => hsn.find((h) => h.id === id);

  return (
    <div className={css({ display: "flex", flexDirection: "column", gap: "3" })}>
      {current && (
        <div className={css({ border: "1px solid", borderColor: "border.subtle", borderRadius: "lg", padding: "3", display: "flex", flexDirection: "column", gap: "1.5" })}>
          <div className={rowStyle}>
            <StatusPill status={current.status} />
            <strong>HSN {codeOf(current.hsnId)?.code ?? "—"}</strong>
            <span className={css({ color: "fg.muted", fontSize: "sm" })}>from {shortDate(current.effectiveFrom)}</span>
          </div>
          {codeOf(current.hsnId) && <Hint>{codeOf(current.hsnId)!.description}</Hint>}
          {current.basis && <Hint>Basis: {current.basis}</Hint>}
          {current.approvedBy && <Hint>Approved by {current.approvedBy}</Hint>}
        </div>
      )}

      {current?.status === "NEEDS_ACCOUNTANT_APPROVAL" && (
        <div className={css({ display: "flex", flexDirection: "column", gap: "2" })}>
          <Notice>Waiting for the accountant. Approving makes this the classification the engine uses for this piece, from the date above.</Notice>
          <div className={fieldStyle}><Label htmlFor="acc-name">Accountant&apos;s name</Label><Input id="acc-name" value={accountant} onChange={(e) => setAccountant(e.target.value)} /></div>
          <div className={fieldStyle}><Label htmlFor="acc-reason">Reason (needed to reject)</Label><Textarea id="acc-reason" value={reason} onChange={(e) => setReason(e.target.value)} /></div>
          <div className={rowStyle}>
            <Button disabled={busy || !accountant.trim()} onClick={() => act({ action: "approve", mappingId: current.id, approverName: accountant }, "Approved")}>Approve</Button>
            <Button variant="outline" disabled={busy || !accountant.trim() || !reason.trim()} onClick={() => act({ action: "reject", mappingId: current.id, approverName: accountant, reason }, "Sent back")}>Reject</Button>
          </div>
        </div>
      )}

      {(!current || current.status === "NEEDS_PRODUCT_INFORMATION" || current.status === "VERIFIED") && (
        <div className={css({ display: "flex", flexDirection: "column", gap: "2" })}>
          <strong className={css({ fontSize: "sm" })}>{current?.status === "VERIFIED" ? "Submit a different classification" : "Submit for approval"}</strong>
          {!complete && <Hint>The material details must be complete and confirmed first.</Hint>}
          <div className={gridStyle}>
            <div className={fieldStyle}>
              <Label htmlFor="cls-code">Heading (HSN)</Label>
              <Select value={code} onValueChange={setCode}>
                <SelectTrigger id="cls-code"><SelectValue placeholder="Choose" /></SelectTrigger>
                <SelectContent>{hsn.map((h) => <SelectItem key={h.id} value={h.id}>{h.code} — {h.description.slice(0, 60)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className={fieldStyle}><Label htmlFor="cls-from">Applies from</Label><Input id="cls-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          </div>
          <div className={fieldStyle}><Label htmlFor="cls-basis">Why this heading</Label><Textarea id="cls-basis" value={basis} onChange={(e) => setBasis(e.target.value)} /></div>
          <Button disabled={busy || !complete || !code || !from} onClick={() => act({ action: "submit", hsnId: code, effectiveFrom: from, basis: basis || null }, "Submitted for approval")} className={css({ alignSelf: "flex-start" })}>Submit for approval</Button>
        </div>
      )}
    </div>
  );
}

export function Trail({ events }: { events: TrailEvent[] }) {
  if (events.length === 0) return <Hint>Nothing has been recorded for this piece yet.</Hint>;
  return (
    <ol className={css({ display: "flex", flexDirection: "column", gap: "1.5", fontSize: "sm" })}>
      {events.map((e) => (
        <li key={e.id}>
          <strong>{ACTION_TEXT[e.action] ?? e.action}</strong>
          <span className={css({ color: "fg.muted" })}> · {shortDate(e.createdAt)} · {e.approverName ? `${e.approverName} (via ${e.actorName ?? "admin"})` : (e.actorName ?? "admin")}</span>
          {e.reason && <div className={css({ color: "fg.muted" })}>{e.reason}</div>}
        </li>
      ))}
    </ol>
  );
}
