/**
 * How an order's customer is presented, in one place.
 *
 * An order can carry its customer three ways: a linked account (online), a
 * name captured at the counter (POS), or nothing at all (a walk-in sale,
 * which must never be blocked just because nobody wanted to give a name).
 * Every screen that shows "who bought this" resolves it through here so the
 * three channels read consistently.
 */

export const WALK_IN_CUSTOMER_LABEL = "Walk-in customer";

export interface OrderCustomerSource {
  customerName?: string | null;
  customerMobile?: string | null;
  user?: { name?: string | null; email?: string | null; mobile?: string | null } | null;
}

/** Always returns something printable — falls back to the walk-in label. */
export function orderCustomerName(order: OrderCustomerSource): string {
  return (
    order.user?.name?.trim() ||
    order.customerName?.trim() ||
    WALK_IN_CUSTOMER_LABEL
  );
}

/**
 * The best secondary line for the customer, or null when there is none.
 * Returning null rather than an empty string is deliberate: callers omit the
 * line entirely instead of rendering a blank or a dash.
 */
export function orderCustomerContact(order: OrderCustomerSource): string | null {
  return (
    order.user?.email?.trim() ||
    order.user?.mobile?.trim() ||
    order.customerMobile?.trim() ||
    null
  );
}
