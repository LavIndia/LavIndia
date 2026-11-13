"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { css } from "styled-system/css";

const barStyle = css({
  display: "flex",
  flexDirection: "column",
  gap: "3",
  borderRadius: "xl",
  border: "1px solid",
  borderColor: "accent.default",
  background: "gold.50",
  padding: "3",
  md: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
});
const countStyle = css({ fontSize: "sm", fontWeight: "medium", color: "fg.default" });
const actionsStyle = css({ display: "flex", flexWrap: "wrap", gap: "2" });
const iconStyle = css({ height: "3.5", width: "3.5" });
const spinStyle = css({ height: "4", width: "4", animation: "spin" });

/**
 * "N selected — Delete" for any admin list, with one confirmation.
 *
 * Deletes go through the same per-item endpoint the row's own delete button
 * uses, so every rule that endpoint enforces still applies — a category that
 * still has products, say, is refused exactly as it is one at a time. What
 * could not be deleted is reported with the server's own reason rather than
 * a bare "failed".
 */
export function BulkDeleteBar({
  ids,
  noun,
  plural = `${noun}s`,
  endpointFor,
  onClear,
  detail,
}: {
  ids: readonly string[];
  /** "banner", "filter" … for the sentences. */
  noun: string;
  plural?: string;
  /** The DELETE URL for one item. */
  endpointFor: (id: string) => string;
  onClear: () => void;
  /** An extra line in the confirmation, for what deleting also does. */
  detail?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [working, setWorking] = useState(false);

  if (ids.length === 0) return null;
  const label = ids.length === 1 ? noun : plural;

  const run = async () => {
    setWorking(true);
    try {
      const results = await Promise.all(
        ids.map(async (id) => {
          try {
            const response = await fetch(endpointFor(id), { method: "DELETE" });
            const body = (await response.json().catch(() => ({}))) as { error?: string };
            return { ok: response.ok, error: body.error };
          } catch {
            return { ok: false, error: "Could not reach the server" };
          }
        }),
      );
      const deleted = results.filter((result) => result.ok).length;
      const failed = results.filter((result) => !result.ok);
      if (deleted > 0) toast.success(`${deleted} ${deleted === 1 ? noun : plural} deleted`);
      if (failed.length > 0) {
        const reason = failed.find((result) => result.error)?.error;
        toast.error(
          `${failed.length} could not be deleted${reason ? ` — ${reason}` : ""}`,
        );
      }
      setOpen(false);
      onClear();
      router.refresh();
    } finally {
      setWorking(false);
    }
  };

  return (
    <>
      <div className={barStyle} role="status">
        <span className={countStyle}>
          {ids.length} {label} selected
        </span>
        <div className={actionsStyle}>
          <Button variant="outline" size="sm" onClick={onClear}>
            Clear
          </Button>
          <Button variant="destructive" size="sm" onClick={() => setOpen(true)}>
            <Trash2 className={iconStyle} />
            Delete
          </Button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={(next) => !working && setOpen(next)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Delete {ids.length} {label}?
            </DialogTitle>
            <DialogDescription>
              This cannot be undone.{detail ? ` ${detail}` : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={working}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={run} disabled={working}>
              {working && <Loader2 className={spinStyle} />}
              Delete {ids.length}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
