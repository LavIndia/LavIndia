/**
 * The Orders domain's public contract.
 *
 * ONE order system for both sales channels. A counter sale and an online
 * checkout produce the same Order, distinguished only by `source` — there is
 * no separate "POS order" anywhere in this system, because two order tables
 * means two places to fix every reporting bug forever.
 */
import type { Tx } from "../_shared/db";
import type { CustomerId, OrderId, VariantId } from "../_shared/ids";

export type OrderSource = "ONLINE" | "STORE";

export type OrderStatus =
  | "PENDING"
  | "PROCESSING"
  | "SHIPPED"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED"
  | "REFUNDED";

export type PaymentStatus = "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED";

/** How a counter sale was paid for. */
export type PosPaymentMethod = "CASH" | "UPI" | "CARD" | "OTHER";

/**
 * One line being sold.
 *
 * The caller supplies the variant and quantity; price comes from the catalog
 * unless explicitly overridden, so a client can never set its own price.
 */
export interface OrderLineInput {
  variantId: VariantId;
  quantity: number;
  /**
   * An authorised price override, in paisa. The catalog price is still
   * recorded alongside it, so a discount is always visible as a discount
   * rather than disappearing into a changed price.
   */
  overridePriceCents?: number;
  overrideReason?: string;
}

/** Who the sale is for. All three are optional — a walk-in has none of them. */
export interface OrderCustomerInput {
  customerId?: CustomerId;
  name?: string;
  mobile?: string;
  gstin?: string;
  /** Online orders ship somewhere; counter sales are handed over. */
  addressId?: string;
}

export interface CreateOrderInput {
  source: OrderSource;
  lines: readonly OrderLineInput[];
  customer?: OrderCustomerInput;
  payment: {
    method: string;
    status: PaymentStatus;
    /** UPI transaction id, card approval code, gateway payment id. */
    reference?: string;
    /** The customer's UPI ID, recorded on the invoice for reconciliation. */
    payerVpa?: string;
    /** UPI RRN / UTR — the bank's reference for the transfer. */
    utr?: string;
  };
  status?: OrderStatus;
  shippingCents?: number;
  discountCode?: string;
  discountCents?: number;
  notes?: string;
  /** Who rang up the sale. Null for a customer's own online checkout. */
  actorId?: string;
  /** Makes a retried submission safe — the same key returns the same order. */
  idempotencyKey?: string;
}

/** A line as it was actually sold, frozen at that moment. */
export interface OrderLineSnapshot {
  variantId: VariantId;
  productId: string;
  name: string;
  variantName: string | null;
  sku: string | null;
  barcode: string | null;
  quantity: number;
  /** List price before any override or discount. */
  catalogPriceCents: number;
  /** What was actually charged per unit. */
  priceCents: number;
  /** What one unit cost the shop, frozen at the moment of sale. */
  unitCostCents: number | null;
  discountCents: number;
  taxCents: number;
  taxRateBps: number;
  lineTotalCents: number;
}

export interface OrderTotals {
  subtotalCents: number;
  discountCents: number;
  taxCents: number;
  shippingCents: number;
  grandTotalCents: number;
}

export interface CreatedOrder {
  orderId: OrderId;
  orderNumber: string;
  source: OrderSource;
  lines: OrderLineSnapshot[];
  totals: OrderTotals;
  createdAt: Date;
}

/**
 * How other modules create orders.
 *
 * Both channels call `createOrder`. It resolves prices from the catalog,
 * consumes inventory and writes the order in ONE transaction, so an order
 * that exists always has its stock accounted for.
 */
export interface OrdersPort {
  createOrder(input: CreateOrderInput, tx?: Tx): Promise<CreatedOrder>;
}
