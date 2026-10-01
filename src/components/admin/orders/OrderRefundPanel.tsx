"use client";

import { Button } from "@/components/ui/button";
import { css } from "styled-system/css";
import {
  PAID_AFTER_CANCELLATION_LABEL,
  REFUND_OWED_LABEL,
  refundMethodLabel,
} from "@/modules/orders/order-labels";
import {
  canRecordRefund,
  isPaidAfterCancellation,
  isRefundOwed,
} from "@/modules/orders/refund-state";
import { formatOrderDate, formatRupees } from "./OrderBadges";
import type { OrderRow } from "./order-types";

const sectionTitleStyle = css({
  fontFamily: "display",
  fontSize: "md",
  fontWeight: "semibold",
  color: "fg.default",
  marginBottom: "2",
});
const owedStyle = css({
  display: "flex",
  flexDirection: "column",
  gap: "3",
  padding: "4",
  borderRadius: "lg",
  border: "1px solid",
  borderColor: "gold.300",
  background: "gold.50",
});
const owedTitleStyle = css({ fontWeight: "semibold", color: "fg.default" });
const owedTextStyle = css({ fontSize: "sm", color: "fg.muted" });
const rowStyle = css({ display: "flex", justifyContent: "space-between", gap: "3", fontSize: "sm" });
const labelStyle = css({ color: "fg.muted" });
const valueStyle = css({ color: "fg.default", textAlign: "right", overflowWrap: "anywhere" });

/**
 * The refund side of a closed, paid order.
 *
 * Until a refund is recorded, a clear prompt saying it is owed — with why,
 * when the money arrived only after cancellation. Once recorded, what went
 * back, how, when and the reference; each line omitted when it has no value.
 * Nothing at all for an order that took no money.
 */
export function OrderRefundPanel({
  order,
  onRecordRefund,
}: {
  order: OrderRow;
  onRecordRefund: (order: OrderRow) => void;
}) {
  if (!canRecordRefund(order)) return null;
  const payment = order.payment;

  if (isRefundOwed(order)) {
    const late = isPaidAfterCancellation(payment?.metadata);
    return (
      <div className={owedStyle} role="status">
        <span className={owedTitleStyle}>
          {late ? PAID_AFTER_CANCELLATION_LABEL : REFUND_OWED_LABEL}
          {payment?.amountCents ? ` · ${formatRupees(payment.amountCents)}` : ""}
        </span>
        <span className={owedTextStyle}>
          {late
            ? "The client's payment arrived after this order was cancelled. Nothing was taken from stock. Send the money back, then record it here."
            : "This order was paid and has been cancelled. Send the money back, then record it here."}
        </span>
        <Button size="sm" onClick={() => onRecordRefund(order)}>
          Record refund
        </Button>
      </div>
    );
  }

  if (!payment?.refundedCents) return null;
  const method = refundMethodLabel(payment.refundMethod);

  return (
    <div>
      <h3 className={sectionTitleStyle}>Refund</h3>
      <div className={css({ display: "flex", flexDirection: "column", gap: "1" })}>
        <div className={rowStyle}>
          <span className={labelStyle}>Amount</span>
          <span className={valueStyle}>
            {formatRupees(payment.refundedCents)}
            {payment.refundedCents < payment.amountCents
              ? ` of ${formatRupees(payment.amountCents)}`
              : ""}
          </span>
        </div>
        {method && (
          <div className={rowStyle}>
            <span className={labelStyle}>Sent by</span>
            <span className={valueStyle}>{method}</span>
          </div>
        )}
        {payment.refundReference && (
          <div className={rowStyle}>
            <span className={labelStyle}>Reference</span>
            <span className={valueStyle}>{payment.refundReference}</span>
          </div>
        )}
        {payment.refundedAt && (
          <div className={rowStyle}>
            <span className={labelStyle}>Recorded</span>
            <span className={valueStyle}>{formatOrderDate(payment.refundedAt)}</span>
          </div>
        )}
      </div>
      <Button
        size="sm"
        variant="outline"
        className={css({ marginTop: "3" })}
        onClick={() => onRecordRefund(order)}
      >
        Update refund
      </Button>
    </div>
  );
}
