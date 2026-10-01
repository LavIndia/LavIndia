/**
 * The shape the Orders screen renders.
 *
 * Declared once and shared by the table, the mobile cards and the detail
 * panel, so a field added to the query reaches all three rather than being
 * re-typed in each. It is deliberately narrower than the Prisma row: only
 * what is actually shown is selected, and only what is selected is typed.
 */

export type OrderStatus =
  | "PENDING"
  | "PROCESSING"
  | "SHIPPED"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED"
  | "REFUNDED";

export type PaymentStatus = "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED";

export type OrderChannel = "ONLINE" | "STORE";

export interface OrderRow {
  id: string;
  orderNumber: string;
  totalCents: number;
  shippingCents: number;
  taxCents: number;
  /** True when the GST is inside the prices rather than added on top. */
  taxIncluded: boolean;
  codFeeCents: number;
  discountCents: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: string | null;
  source: OrderChannel;
  createdAt: Date;
  /** Null for a walk-in sale, which is made without an account. */
  user: { name: string | null; email: string | null; mobile: string | null } | null;
  customerName: string | null;
  customerMobile: string | null;
  items: Array<{
    id: string;
    name: string;
    variantName: string | null;
    sku: string | null;
    quantity: number;
    priceCents: number;
    categoryName: string | null;
  }>;
  /** Null for a counter sale, which is handed over rather than shipped. */
  address: {
    fullName: string;
    addressLine1: string;
    city: string;
    state: string;
    pincode: string;
  } | null;
  /**
   * What the money actually came in on. `Order.paymentMethod` only says which
   * route was chosen ("razorpay"); this says which instrument carried it.
   */
  payment: {
    method: string | null;
    instrumentDetail: string | null;
    /** What was paid — the most a refund can be. */
    amountCents: number;
    /** A refund staff sent back by hand, once recorded. */
    refundedCents: number | null;
    refundedAt: Date | null;
    refundMethod: string | null;
    refundReference: string | null;
    /** Carries the "paid after cancellation" mark (orders/refund-state). */
    metadata: unknown;
  } | null;
  /**
   * Present once a bill has been raised. A COD order has none until it is
   * settled, so the row links to the invoice only when there is one.
   */
  invoice: {
    invoiceNumber: string;
    /** The credit note that cancelled the invoice, once the order was closed. */
    creditNoteNumber: string | null;
  } | null;
}

/** The category options offered by the filter bar. */
export interface CategoryOption {
  id: string;
  name: string;
}

/** Totals for the current filter, so the numbers describe what is on screen. */
export interface OrdersSummary {
  orderCount: number;
  /** Of those, the orders that are sales — not cancelled, refunded or unpaid. */
  saleCount: number;
  /** What clients paid on those sales, GST counted once. */
  paidCents: number;
  storeCount: number;
  onlineCount: number;
}
