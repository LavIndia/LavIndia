"use client";

import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { css } from "styled-system/css";
import { REFUND_METHODS, REFUND_METHOD_LABELS } from "@/modules/orders/order-labels";
import { formatRupees } from "./OrderBadges";
import { patchOrder } from "./patch-order";
import type { OrderRow } from "./order-types";

/**
 * What the dialog was opened for: closing an order from the stage menu, or
 * recording the refund on one that is already closed.
 */
export interface CloseIntent {
  order: OrderRow;
  mode: "change" | "record";
  status: "CANCELLED" | "REFUNDED";
}

const formStyle = css({ display: "flex", flexDirection: "column", gap: "4" });
const fieldStyle = css({ display: "flex", flexDirection: "column", gap: "1.5" });
const noticeStyle = css({
  fontSize: "sm",
  color: "fg.default",
  background: "gold.50",
  border: "1px solid",
  borderColor: "gold.200",
  borderRadius: "md",
  padding: "3",
});
const hintStyle = css({ fontSize: "xs", color: "fg.muted" });
const checkRowStyle = css({ display: "flex", alignItems: "center", gap: "2", fontSize: "sm" });

/** Whether choosing `status` for this order needs the dialog rather than a plain change. */
export function needsCloseDialog(order: OrderRow, status: string): boolean {
  if (status !== "CANCELLED" && status !== "REFUNDED") return false;
  const paid = order.paymentStatus === "COMPLETED" || order.paymentStatus === "REFUNDED";
  const uncredited = Boolean(order.invoice && !order.invoice.creditNoteNumber);
  return paid || uncredited;
}

/**
 * Closing an order, and the refund that goes with it.
 *
 * Says plainly when the invoice will be credited — a credit note cannot be
 * taken back, so the order cannot be reopened afterwards. On a paid order it
 * also takes the refund staff sent back by hand: how much (the amount paid,
 * unless less went back), how, and the reference to reconcile it by. Nothing
 * here moves money.
 */
export function CloseOrderDialog({
  intent,
  onClose,
  onDone,
}: {
  intent: CloseIntent | null;
  onClose: () => void;
  onDone: () => void;
}) {
  if (!intent) return null;
  // Keyed, so each opening starts afresh from the order's own figures.
  return (
    <CloseOrderForm
      key={`${intent.order.id}-${intent.mode}-${intent.status}`}
      intent={intent}
      onClose={onClose}
      onDone={onDone}
    />
  );
}

function CloseOrderForm({
  intent,
  onClose,
  onDone,
}: {
  intent: CloseIntent;
  onClose: () => void;
  onDone: () => void;
}) {
  const { order } = intent;
  const payment = order.payment;
  const paid = order.paymentStatus === "COMPLETED" || order.paymentStatus === "REFUNDED";
  const paidCents = payment?.amountCents ?? 0;

  const [recording, setRecording] = useState(intent.mode === "record" || intent.status === "REFUNDED");
  const [markRefunded, setMarkRefunded] = useState(true);
  const [amount, setAmount] = useState(
    ((payment?.refundedCents ?? payment?.amountCents ?? 0) / 100).toFixed(2),
  );
  const [method, setMethod] = useState<string>(payment?.refundMethod ?? "ORIGINAL");
  const [reference, setReference] = useState(payment?.refundReference ?? "");
  const [saving, setSaving] = useState(false);

  const crediting = intent.mode === "change" && order.invoice && !order.invoice.creditNoteNumber;
  const takesRefund = paid && recording;
  // Recording on a cancelled order may also move it to Refunded — the
  // admin's choice, since a part refund can leave more still to send.
  const nextStatus =
    intent.mode === "change"
      ? intent.status
      : order.status === "CANCELLED" && markRefunded
        ? "REFUNDED"
        : order.status;

  const title =
    intent.mode === "record"
      ? "Record refund"
      : intent.status === "REFUNDED"
        ? "Mark as refunded"
        : "Cancel order";

  const submit = async () => {
    const amountCents = Math.round(Number(amount) * 100);
    if (takesRefund && (!Number.isFinite(amountCents) || amountCents <= 0)) {
      toast.error("Enter the amount refunded");
      return;
    }
    if (takesRefund && amountCents > paidCents) {
      toast.error(`A refund cannot be more than the ${formatRupees(paidCents)} paid`);
      return;
    }
    setSaving(true);
    const result = await patchOrder(
      order.id,
      nextStatus as OrderRow["status"],
      takesRefund ? { amountCents, method, reference: reference.trim() || undefined } : undefined,
    );
    setSaving(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(takesRefund ? "Refund recorded" : "Order updated");
    onDone();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !saving && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{order.orderNumber}</DialogDescription>
        </DialogHeader>

        <div className={formStyle}>
          {crediting && (
            <p className={noticeStyle}>
              Invoice {order.invoice!.invoiceNumber} will be cancelled by a credit note. This
              cannot be undone, and the order cannot be reopened afterwards.
            </p>
          )}

          {paid && intent.mode === "change" && (
            <Checkbox className={checkRowStyle} checked={recording} onCheckedChange={setRecording}>
              I have sent the refund — record it now
            </Checkbox>
          )}

          {takesRefund && (
            <>
              <div className={fieldStyle}>
                <Label htmlFor="refund-amount">Amount refunded (₹)</Label>
                <Input
                  id="refund-amount"
                  type="number"
                  inputMode="decimal"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                />
                <span className={hintStyle}>Paid: {formatRupees(paidCents)}</span>
              </div>
              <div className={fieldStyle}>
                <Label htmlFor="refund-method">Sent by</Label>
                <Select value={method} onValueChange={setMethod}>
                  <SelectTrigger id="refund-method" aria-label="Sent by">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REFUND_METHODS.map((code) => (
                      <SelectItem key={code} value={code}>
                        {REFUND_METHOD_LABELS[code]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className={fieldStyle}>
                <Label htmlFor="refund-reference">Reference</Label>
                <Input
                  id="refund-reference"
                  placeholder="UTR, approval code or a note"
                  maxLength={120}
                  value={reference}
                  onChange={(event) => setReference(event.target.value)}
                />
              </div>
            </>
          )}

          {intent.mode === "record" && order.status === "CANCELLED" && (
            <Checkbox className={checkRowStyle} checked={markRefunded} onCheckedChange={setMarkRefunded}>
              Mark the order as Refunded
            </Checkbox>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Back
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving && <Loader2 className={css({ height: "4", width: "4", animation: "spin" })} />}
            {takesRefund ? "Save refund" : title}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
