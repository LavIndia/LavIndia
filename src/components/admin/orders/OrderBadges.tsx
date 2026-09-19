import { Badge } from "@/components/ui/badge";
import { Store, Globe } from "lucide-react";
import { css } from "styled-system/css";
import { PAYMENT_METHODS } from "@/modules/orders/order-filters";
import type { OrderStatus, PaymentStatus, OrderChannel } from "./order-types";

/**
 * How an order's state is shown, in one place.
 *
 * Shared by the table, the mobile cards and the detail panel so the same
 * order never reads differently depending on where it is looked at.
 */

const STATUS_CONFIG: Record<
  OrderStatus,
  { variant: "default" | "secondary" | "destructive" | "outline"; label: string }
> = {
  PENDING: { variant: "outline", label: "Pending" },
  PROCESSING: { variant: "secondary", label: "Processing" },
  SHIPPED: { variant: "default", label: "Shipped" },
  OUT_FOR_DELIVERY: { variant: "default", label: "Out for delivery" },
  DELIVERED: { variant: "default", label: "Delivered" },
  CANCELLED: { variant: "destructive", label: "Cancelled" },
  REFUNDED: { variant: "destructive", label: "Refunded" },
};

const PAYMENT_CONFIG: Record<
  PaymentStatus,
  { variant: "default" | "secondary" | "destructive" | "outline"; label: string }
> = {
  PENDING: { variant: "outline", label: "Awaiting" },
  COMPLETED: { variant: "default", label: "Paid" },
  FAILED: { variant: "destructive", label: "Failed" },
  REFUNDED: { variant: "secondary", label: "Refunded" },
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const { variant, label } = STATUS_CONFIG[status];
  return <Badge variant={variant}>{label}</Badge>;
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const { variant, label } = PAYMENT_CONFIG[status];
  return <Badge variant={variant}>{label}</Badge>;
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
      {isStore ? "Walk-in" : "Online"}
    </span>
  );
}

/**
 * How the customer paid, as specifically as is known.
 *
 * Three levels, best first:
 *
 * 1. The instrument itself — "HDFC Bank •••• 4242", "ananya@okicici". Captured
 *    from the gateway at verification.
 * 2. The gateway's own method — "upi", "card", "netbanking".
 * 3. The route chosen at checkout — "razorpay", which says only that it was
 *    paid online.
 *
 * Level 3 alone is what "Card / UPI online" was, and it is nearly useless for
 * reconciling a statement. Orders placed before the instrument was captured
 * still fall back to it, so older rows stay legible rather than blank.
 */
export function paymentDescription(order: {
  paymentMethod: string | null;
  payment?: { method: string | null; instrumentDetail: string | null } | null;
}): string {
  const detail = order.payment?.instrumentDetail;
  if (detail) return detail;

  const gatewayMethod = order.payment?.method;
  if (gatewayMethod) {
    const known = PAYMENT_METHODS.find((entry) =>
      (entry.matches as readonly string[]).includes(gatewayMethod),
    );
    if (known) return known.label;
    // "upi" → "UPI", "netbanking" → "Netbanking".
    if (gatewayMethod.length <= 4) return gatewayMethod.toUpperCase();
    return gatewayMethod.charAt(0).toUpperCase() + gatewayMethod.slice(1);
  }

  if (!order.paymentMethod) return "—";
  const option = PAYMENT_METHODS.find((entry) =>
    (entry.matches as readonly string[]).includes(order.paymentMethod!),
  );
  return option?.label ?? order.paymentMethod;
}

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
