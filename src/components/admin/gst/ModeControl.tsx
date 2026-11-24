"use client";

import { useState } from "react";
import { toast } from "sonner";
import { css } from "styled-system/css";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { send } from "./gst-client";
import { Hint, Notice, StatusPill, rowStyle } from "./gst-ui";

export interface Check {
  id: string;
  label: string;
  ok: boolean;
  detail: string;
  blocking: boolean;
}

const MEANING: Record<string, string> = {
  OFF: "The engine does nothing. Checkout, the counter and invoices work exactly as they always have.",
  SHADOW: "The engine calculates beside the existing checkout and records any difference. Nobody is charged differently.",
  ENFORCE: "The engine sets the tax. Customers are charged by it and invoices carry its figures. Only for approved classifications and rates.",
};

/**
 * The engine's switch. Turning it OFF is always one click. Turning it on goes
 * through the checks, and enforcing also needs the name of whoever approves it.
 */
export function ModeControl({ mode, checks, onChanged }: { mode: string; checks: { SHADOW: Check[]; ENFORCE: Check[] }; onChanged: () => void }) {
  const [target, setTarget] = useState<"SHADOW" | "ENFORCE" | null>(null);
  const [approver, setApprover] = useState("");
  const [busy, setBusy] = useState(false);

  const blockers = target ? checks[target].filter((c) => c.blocking && !c.ok) : [];

  async function change(next: "OFF" | "SHADOW" | "ENFORCE", approvedBy?: string) {
    setBusy(true);
    try {
      await send("/api/admin/gst/profile", "POST", { action: "mode", mode: next, approvedBy });
      toast.success(next === "OFF" ? "GST engine switched OFF" : `GST engine is now in ${next} mode`);
      setTarget(null);
      onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not change the mode");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className={rowStyle}>
        <StatusPill status={mode} />
        <Hint>{MEANING[mode]}</Hint>
      </div>
      <div className={rowStyle}>
        {mode !== "OFF" && (
          <Button variant="outline" onClick={() => change("OFF")} disabled={busy}>
            Switch OFF
          </Button>
        )}
        {mode === "OFF" && (
          <Button variant="outline" onClick={() => setTarget("SHADOW")}>
            Start shadow mode…
          </Button>
        )}
        {mode !== "ENFORCE" && <Button onClick={() => setTarget("ENFORCE")}>Enforce GST…</Button>}
      </div>

      <Dialog open={target !== null} onOpenChange={(open) => !open && setTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{target === "ENFORCE" ? "Enforce GST on customer orders?" : "Start shadow mode?"}</DialogTitle>
            <DialogDescription>{target ? MEANING[target] : ""}</DialogDescription>
          </DialogHeader>
          {blockers.length > 0 ? (
            <Notice tone="warn">
              <strong>Not ready yet.</strong>
              <ul className={css({ marginTop: "2", paddingLeft: "5", listStyle: "disc" })}>
                {blockers.map((b) => (
                  <li key={b.id}>
                    {b.label} — <span className={css({ color: "fg.muted" })}>{b.detail}</span>
                  </li>
                ))}
              </ul>
            </Notice>
          ) : target === "ENFORCE" ? (
            <div className={css({ display: "flex", flexDirection: "column", gap: "1.5" })}>
              <Label htmlFor="approver">Who is approving this?</Label>
              <Input id="approver" value={approver} onChange={(e) => setApprover(e.target.value)} placeholder="Name of the accountant or owner" />
              <Hint>Recorded against the change. Enforcing changes what customers pay and what invoices say.</Hint>
            </div>
          ) : (
            <Hint>Every check for shadow mode is satisfied.</Hint>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setTarget(null)}>
              Cancel
            </Button>
            <Button disabled={busy || blockers.length > 0 || (target === "ENFORCE" && !approver.trim())} onClick={() => target && change(target, approver)}>
              {target === "ENFORCE" ? "Enforce GST" : "Start shadow mode"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
