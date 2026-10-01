import { Badge } from "@/components/ui/badge";
import { Store, Globe } from "lucide-react";
import { css } from "styled-system/css";
import {
  CHANNEL_LABELS,
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
} from "@/modules/orders/order-labels";
import type { OrderStatus, PaymentStatus, OrderChannel } from "./order-types";

/**
 * How an order's state is shown, in one place.
 *
 * Shared by the table, the mobile cards and the detail panel so the same
 * order never reads differently depending on where it is looked at.
 */

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

/** Only the tone lives here; the words come from the shared label map. */
const STATUS_VARIANT: Record<OrderStatus, BadgeVariant> = {
  PENDING: "outline",
  PROCESSING: "secondary",
  SHIPPED: "default",
  OUT_FOR_DELIVERY: "default",
  DELIVERED: "default",
  CANCELLED: "destructive",
  REFUNDED: "destructive",
};

const PAYMENT_VARIANT: Record<PaymentStatus, BadgeVariant> = {
  PENDING: "outline",
  COMPLETED: "default",
  FAILED: "destructive",
  REFUNDED: "secondary",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{ORDER_STATUS_LABELS[status]}</Badge>;
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return <Badge variant={PAYMENT_VARIANT[status]}>{PAYMENT_STATUS_LABELS[status]}</Badge>;
}

const channelStyle = css({
  display: "inline-flex",
  alignItems: "center",
  gap: "1.5",
  fontSize: "xs",
  fontWeight: "medium",
  whiteSpace: "nowrap",
});
const channelIconStyle = css({ height: "3.5", width: "3.5" });

/**
 * Which channel the sale came through.
 *
 * Shown on every row rather than left implicit: with both channels in one
 * list, a counter sale and a web sale are otherwise indistinguishable.
 */
export function ChannelBadge({ channel }: { channel: OrderChannel }) {
  const isStore = channel === "STORE";
  return (
    <span
      className={channelStyle}
      title={isStore ? "Sold at the counter" : "Placed on the website"}
    >
      {isStore ? (
        <Store className={channelIconStyle} />
      ) : (
        <Globe className={channelIconStyle} />
      )}
      {CHANNEL_LABELS[channel]}
    </span>
  );
}

/** How the customer paid — shared with the CSV export, so it lives with the labels. */
export { paymentDescription } from "@/modules/orders/order-labels";

/** Paisa as rupees, grouped the Indian way. */
export function formatRupees(paisa: number): string {
  return `₹${(paisa / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

/**
 * How much was actually sold on an order.
 *
 * Counting the LINES is the tempting shortcut and it is wrong: one line of
 * quantity two is two pieces leaving the shelf, and a list that calls it
 * "1 item" understates the sale and disagrees with the stock ledger. Pieces
 * lead, because that is the figure that moved; the number of distinct
 * products follows as context, and only when it differs.
 */
export function itemSummary(items: Array<{ quantity: number }>): {
  pieces: string;
  products: string | null;
} {
  const pieces = items.reduce((total, item) => total + item.quantity, 0);
  return {
    pieces: pieces === 1 ? "1 piece" : `${pieces} pieces`,
    products:
      items.length === pieces
        ? null
        : items.length === 1
          ? "1 product"
          : `${items.length} products`,
  };
}

/** A short, unambiguous date — the list spans months, so the year matters. */
export function formatOrderDate(value: Date | string): string {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
