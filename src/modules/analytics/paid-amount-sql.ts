import { Prisma } from "@prisma/client";

/**
 * The SQL form of `orderPaidCents` and `SALE_STATUSES`, for grouped
 * aggregates. Every fragment expects the orders table aliased as `o` (and
 * order lines as `oi`).
 *
 * Server-only: `Prisma.sql` must not reach a client bundle, which is why
 * these live apart from the pure helpers in `paid-amount.ts`.
 */

/** What the client paid for order `o`, in paise. */
export const PAID_CENTS_SQL = Prisma.sql`GREATEST(
  o."totalCents" - o."discountCents" + o."shippingCents" + o."codFeeCents"
  + CASE WHEN o."taxIncluded" THEN 0 ELSE o."taxCents" END, 0)`;

/** Order `o` is a sale: paid for (or due on delivery) and not given back. */
export const IS_SALE_SQL = Prisma.sql`o."status" IN ('PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED')`;

/**
 * Order lines with what each one was actually charged, GST included.
 *
 * The order's charge for its goods — what was paid less delivery and the
 * cash-on-delivery fee — is shared across its lines by each line's net value
 * (`priceCents` × quantity; `priceCents` is already after offers and manual
 * overrides). On a current order that is simply the line's net plus its GST;
 * on older orders, whose coupon sat on the order and never reached the lines,
 * it spreads the coupon too. Either way an order's lines add up exactly to
 * what was paid for the goods, and quantity is always counted.
 *
 * Produces a CTE named `charged_lines` with the line's columns plus
 * `charged_cents`, restricted to sale orders and the optional extra filter.
 */
export function chargedLinesCte(extraWhere: Prisma.Sql = Prisma.empty) {
  return Prisma.sql`charged_lines AS (
    SELECT oi."productId", oi."name", oi."quantity", o."id" AS "orderId",
           o."source", o."createdAt",
           CASE WHEN SUM(oi."priceCents" * oi."quantity") OVER w > 0
             THEN GREATEST(o."totalCents" - o."discountCents"
                    + CASE WHEN o."taxIncluded" THEN 0 ELSE o."taxCents" END, 0)::numeric
                  * oi."priceCents" * oi."quantity"
                  / SUM(oi."priceCents" * oi."quantity") OVER w
             ELSE 0 END AS charged_cents
    FROM "order_items" oi
    JOIN "orders" o ON o."id" = oi."orderId"
    WHERE ${IS_SALE_SQL} ${extraWhere}
    WINDOW w AS (PARTITION BY o."id")
  )`;
}
