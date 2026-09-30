"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { css } from "styled-system/css";
import type { ProductListItemProduct } from "./ProductListItem";

const spinner = css({ height: "4", width: "4", animation: "spin" });
const footer = css({ flexWrap: "wrap", gap: "2" });

function lines(count: number) {
  return `${count} order line${count === 1 ? "" : "s"}`;
}

/** Deletes one product; `force` is required once it has been sold. */
async function requestDelete(id: string, force: boolean) {
  const res = await fetch(`/api/admin/products/${id}${force ? "?force=1" : ""}`, {
    method: "DELETE",
  });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, body };
}

interface ProductDeleteDialogProps {
  product: ProductListItemProduct | null;
  onClose: () => void;
  onDone: (deletedId: string | null) => void;
}

/**
 * Delete for a single product.
 *
 * A piece that has never been sold is simply deleted. One that has been sold
 * is offered two ways out, because they mean different things: Retire keeps
 * it in the catalog and sells what is left, Delete removes it for good while
 * every order, invoice and stock movement keeps its record of it.
 */
export function ProductDeleteDialog({ product, onClose, onDone }: ProductDeleteDialogProps) {
  const [busy, setBusy] = useState<"delete" | "retire" | null>(null);
  // Starts from the count loaded with the list, and is corrected if the
  // server reports a sale that happened after the list was loaded.
  const [soldLines, setSoldLines] = useState(0);

  useEffect(() => {
    setSoldLines(product?.orderLineCount ?? 0);
  }, [product]);

  if (!product) return <Dialog open={false} />;
  const sold = soldLines > 0;

  const remove = async () => {
    setBusy("delete");
    try {
      const { ok, body } = await requestDelete(product.id, sold);
      if (!ok && body.code === "PRODUCT_HAS_ORDERS") {
        setSoldLines(Number(body.details?.orderLineCount) || 1);
        return;
      }
      if (!ok) throw new Error(body.error);
      toast.success(
        sold
          ? `${product.name} deleted — ${lines(soldLines)} kept on their orders`
          : `${product.name} deleted`,
      );
      onDone(product.id);
    } catch {
      toast.error("Failed to delete product");
    } finally {
      setBusy(null);
    }
  };

  const retire = async () => {
    setBusy("retire");
    try {
      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ retired: true }),
      });
      if (!res.ok) throw new Error();
      toast.success(`${product.name} retired — what is left keeps selling`);
      onDone(null);
    } catch {
      toast.error("Failed to retire product");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{sold ? "Delete a piece that has been sold?" : "Delete product?"}</DialogTitle>
          <DialogDescription>
            {sold
              ? `"${product.name}" appears on ${lines(soldLines)}. Deleting removes it from the catalog for good; those orders, their invoices and the stock history keep their record of it.`
              : `"${product.name}" will be permanently deleted. This cannot be undone.`}
          </DialogDescription>
        </DialogHeader>
        {sold && !product.retiredAt && (
          <p className={css({ fontSize: "sm", color: "fg.muted" })}>
            If you only mean never to stock it again, retire it instead: what is on the shelf
            keeps selling, and it leaves the shop by itself when the last piece sells.
          </p>
        )}
        <DialogFooter className={footer}>
          <Button variant="outline" onClick={onClose} disabled={busy !== null}>
            Cancel
          </Button>
          {sold && !product.retiredAt && (
            <Button variant="outline" onClick={retire} disabled={busy !== null}>
              {busy === "retire" && <Loader2 className={spinner} />}
              Retire instead
            </Button>
          )}
          <Button variant="destructive" onClick={remove} disabled={busy !== null}>
            {busy === "delete" && <Loader2 className={spinner} />}
            {sold ? "Delete permanently" : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface BulkDeleteDialogProps {
  open: boolean;
  products: ProductListItemProduct[];
  onClose: () => void;
  onDone: () => void;
}

/**
 * Delete for a selection. Pieces that have been sold are left alone unless
 * the admin says otherwise, so a broad selection cannot remove a sales
 * history by accident.
 */
export function BulkDeleteDialog({ open, products, onClose, onDone }: BulkDeleteDialogProps) {
  const [includeSold, setIncludeSold] = useState(false);
  const [working, setWorking] = useState(false);
  const soldCount = products.filter((p) => (p.orderLineCount ?? 0) > 0).length;

  useEffect(() => {
    if (open) setIncludeSold(false);
  }, [open]);

  const run = async () => {
    setWorking(true);
    try {
      const results = await Promise.all(
        products.map((p) => requestDelete(p.id, includeSold).catch(() => ({ ok: false, body: {} }))),
      );
      const deleted = results.filter((r) => r.ok).length;
      const skipped = results.filter((r) => r.body?.code === "PRODUCT_HAS_ORDERS").length;
      const failed = results.length - deleted - skipped;

      if (deleted > 0) toast.success(`${deleted} product${deleted === 1 ? "" : "s"} deleted`);
      if (skipped > 0) toast.info(`${skipped} kept because they have been sold`);
      if (failed > 0) toast.error(`${failed} could not be deleted`);
      onDone();
    } finally {
      setWorking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {products.length} products?</DialogTitle>
          <DialogDescription>This cannot be undone.</DialogDescription>
        </DialogHeader>
        {soldCount > 0 && (
          <Checkbox isSelected={includeSold} onChange={setIncludeSold}>
            Also delete the {soldCount} that {soldCount === 1 ? "has" : "have"} been sold — their
            orders and invoices are kept
          </Checkbox>
        )}
        <DialogFooter className={footer}>
          <Button variant="outline" onClick={onClose} disabled={working}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={run}
            disabled={working || (!includeSold && soldCount === products.length)}
          >
            {working && <Loader2 className={spinner} />}
            Delete {includeSold ? products.length : products.length - soldCount}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
