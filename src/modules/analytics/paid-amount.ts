/**
 * What a client actually paid for an order — the one definition every sales
 * figure in the admin uses.
 *
 * `totalCents` is the list-price subtotal, before offers and manual
 * discounts, so summing it overstates sales by every rupee given away. What
 * was charged is the subtotal less the discount, plus delivery and any
 * cash-on-delivery fee, plus GST only when GST was not already inside the
 * prices (`taxIncluded`) — adding it again would count it twice.
 *
 * Pure and free of Prisma so client components can use it too; the SQL form
 * of the same sum lives in `paid-amount-sql.ts`.
 */
export interface PaidAmountParts {
  totalCents: number;
  discountCents: number;
  shippingCents: number;
  codFeeCents: number;
  taxCents: number;
  taxIncluded: boolean;
}

export function orderPaidCents(order: PaidAmountParts): number {
  const paid =
    order.totalCents -
    order.discountCents +
    order.shippingCents +
    order.codFeeCents +
    (order.taxIncluded ? 0 : order.taxCents);
  return Math.max(paid, 0);
}

/**
 * The statuses that count as a sale.
 *
 * PENDING is an online order whose payment has not gone through (cash on
 * delivery goes straight to PROCESSING, the counter straight to DELIVERED),
 * so nothing has been charged yet. Cancelled and refunded orders were given
 * back. Everything else is money the shop has taken.
 */
export const SALE_STATUSES = ["PROCESSING", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"] as const;
