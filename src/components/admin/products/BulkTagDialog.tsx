"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { css } from "styled-system/css";
import { TagInput } from "./TagInput";

/**
 * Adds and removes tags on every selected product in one go — the quick
 * way to put, say, twenty pieces into "festive edit" before an offer.
 */
export function BulkTagDialog({
  open,
  productIds,
  onClose,
  onDone,
}: {
  open: boolean;
  productIds: string[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [add, setAdd] = useState<string[]>([]);
  const [remove, setRemove] = useState<string[]>([]);
  const [working, setWorking] = useState(false);

  const apply = async () => {
    setWorking(true);
    try {
      const res = await fetch("/api/admin/products/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productIds, add, remove }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Could not update tags");
      toast.success(`Tags updated on ${body.updated} product${body.updated === 1 ? "" : "s"}`);
      setAdd([]);
      setRemove([]);
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update tags");
    } finally {
      setWorking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tag {productIds.length} products</DialogTitle>
          <DialogDescription>Offers can then include these pieces through a Piece Set on the tag.</DialogDescription>
        </DialogHeader>
        <div className={css({ display: "flex", flexDirection: "column", gap: "4" })}>
          <div className={css({ display: "flex", flexDirection: "column", gap: "2" })}>
            <Label htmlFor="bulk-tag-add">Add tags</Label>
            <TagInput id="bulk-tag-add" value={add} onChange={setAdd} />
          </div>
          <div className={css({ display: "flex", flexDirection: "column", gap: "2" })}>
            <Label htmlFor="bulk-tag-remove">Remove tags</Label>
            <TagInput id="bulk-tag-remove" value={remove} onChange={setRemove} placeholder="A tag to take off" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={working}>
            Cancel
          </Button>
          <Button onClick={apply} disabled={working || (add.length === 0 && remove.length === 0)}>
            {working && <Loader2 className={css({ width: "4", height: "4", animation: "spin" })} />}
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
