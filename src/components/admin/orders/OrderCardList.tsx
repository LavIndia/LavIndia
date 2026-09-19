"use client";

import { css, cx } from "styled-system/css";
import { ChevronRight } from "lucide-react";
import {
  orderCustomerContact,
  orderCustomerName,
} from "@/modules/orders/customer-display";
import {
  ChannelBadge,
  OrderStatusBadge,
  PaymentStatusBadge,
  formatOrderDate,
  formatRupees,
  itemSummary,
} from "./OrderBadges";
import type { OrderRow } from "./order-types";

const listStyle = css({
  display: { base: "flex", md: "none" },
  flexDirection: "column",
  gap: "3",
});
const cardStyle = css({
  textAlign: "left",
  width: "full",
  borderRadius: "xl",
  border: "1px solid",
  borderColor: "border.subtle",
  background: "bg.surface",
  boxShadow: "card",
  padding: "3",
  display: "flex",
  flexDirection: "column",
  gap: "2",
});
const topRowStyle = css({
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "2",
});
const numberStyle = css({ fontWeight: "medium", color: "fg.default" });
const subStyle = css({ fontSize: "xs", color: "fg.muted" });
const amountStyle = css({
  fontWeight: "medium",
  color: "fg.default",
  whiteSpace: "nowrap",
  fontVariantNumeric: "tabular-nums",
});
const footRowStyle = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "2",
  paddingTop: "2",
  borderTop: "1px solid",
  borderColor: "border.subtle",
});
const badgeRowStyle = css({ display: "flex", alignItems: "center", gap: "2", flexWrap: "wrap" });
const emptyStyle = css({
  borderRadius: "xl",
  border: "1px solid",
  borderColor: "border.subtle",
  background: "bg.surface",
  padding: "8",
  textAlign: "center",
  color: "fg.muted",
});

/**
 * The orders list on a phone.
 *
 * A table forced onto a narrow screen means horizontal scrolling, which is
 * the one thing that makes a list unusable one-handed — so on small screens
 * each order becomes a card instead. Same data, same order, no side-scroll.
 */
export function OrderCardList({
  orders,
  onSelect,
}: {
  orders: OrderRow[];
  onSelect: (order: OrderRow) => void;
}) {
  if (orders.length === 0) {
    return (
      <div className={listStyle}>
        <p className={cx(emptyStyle)}>No orders match these filters.</p>
      </div>
    );
  }

  return (
    <div className={listStyle}>
      {orders.map((order) => (
        <button
          key={order.id}
          type="button"
          onClick={() => onSelect(order)}
          className={cardStyle}
        >
          <div className={topRowStyle}>
            <div className={css({ minWidth: 0 })}>
              <p className={numberStyle}>{order.orderNumber}</p>
              <p className={subStyle}>
                {[
                  formatOrderDate(order.createdAt),
                  itemSummary(order.items).pieces,
                  order.invoice?.invoiceNumber,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            <p className={amountStyle}>{formatRupees(order.totalCents)}</p>
          </div>

          <div>
            <span className={numberStyle}>{orderCustomerName(order)}</span>
            {orderCustomerContact(order) && (
              <span className={subStyle}> · {orderCustomerContact(order)}</span>
            )}
          </div>

          <div className={footRowStyle}>
            <span className={badgeRowStyle}>
              <ChannelBadge channel={order.source} />
              <PaymentStatusBadge status={order.paymentStatus} />
              <OrderStatusBadge status={order.status} />
            </span>
            <ChevronRight className={css({ height: "4", width: "4", color: "fg.muted" })} />
          </div>
        </button>
      ))}
    </div>
  );
}
