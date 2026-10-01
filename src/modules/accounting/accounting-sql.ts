/**
 * The SQL the accounting screen is built from.
 *
 * Every figure counts the same orders as the Dashboard and Sales Insights —
 * sales only (`IS_SALE_SQL`): never cancelled, refunded or still-unpaid
 * orders — and the money is split the same way `orderPaidCents` adds it up,
 * so "total collected" here is to the paisa what the Dashboard calls sales.
 *
 * Server-only: these build `Prisma.sql` fragments.
 */
import { Prisma } from "@prisma/client";
import { IS_SALE_SQL, PAID_CENTS_SQL } from "@/modules/analytics/paid-amount-sql";

export interface AccountingRange {
  /** Inclusive lower bound, or null for all time. */
  from: Date | null;
  /** Inclusive upper bound; open-ended when absent. */
  to?: Date;
}

/** The period as extra `AND …` conditions on orders aliased `o`. */
export function orderPeriodSql(range: AccountingRange): Prisma.Sql {
  const from = range.from ? Prisma.sql`AND o."createdAt" >= ${range.from}` : Prisma.empty;
  const to = range.to ? Prisma.sql`AND o."createdAt" <= ${range.to}` : Prisma.empty;
  return Prisma.sql`${from} ${to}`;
}

/** The GST already inside the prices of order `o` (zero when it was added on top). */
const GST_INSIDE_SQL = Prisma.sql`CASE WHEN o."taxIncluded" THEN o."taxCents" ELSE 0 END`;

/**
 * The order-level money for the period, one row.
 *
 * Discounts are split into offers and manual reductions from the lines:
 * `promotionDiscountCents` is the offers' part of each line's discount and the
 * rest of a line's discount was given by hand. Older orders carried their
 * coupon on the order without reaching the lines; that remainder is a coupon,
 * so it counts as an offer. Manual is capped at the order's discount so the
 * two parts always add up to exactly what was taken off.
 */
export function orderMoneySql(range: AccountingRange): Prisma.Sql {
  return Prisma.sql`
    SELECT COUNT(*)::bigint                                        AS orders,
           COALESCE(SUM(o."totalCents"), 0)::bigint                AS gross,
           COALESCE(SUM(o."discountCents"), 0)::bigint             AS discounts,
           COALESCE(SUM(LEAST(lines.manual, o."discountCents")), 0)::bigint AS manual,
           COALESCE(SUM(o."taxCents"), 0)::bigint                  AS gst,
           COALESCE(SUM(${GST_INSIDE_SQL}), 0)::bigint             AS "gstInside",
           COALESCE(SUM(o."shippingCents"), 0)::bigint             AS delivery,
           COALESCE(SUM(o."codFeeCents"), 0)::bigint               AS cod,
           COALESCE(SUM(${PAID_CENTS_SQL}), 0)::bigint             AS paid
    FROM "orders" o
    LEFT JOIN LATERAL (
      SELECT GREATEST(COALESCE(SUM(oi."discountCents" - oi."promotionDiscountCents"), 0), 0) AS manual
      FROM "order_items" oi
      WHERE oi."orderId" = o."id"
    ) lines ON TRUE
    WHERE ${IS_SALE_SQL} ${orderPeriodSql(range)}`;
}

/**
 * Sold lines with their share of net sales, as a CTE named `net_lines`.
 *
 * Net sales is what was charged for the goods before GST: the list total, less
 * every discount, less any GST that was inside the prices. Each order's net is
 * shared across its lines by each line's value (`priceCents` × quantity), so
 * an older order's coupon reaches its lines too and an order's lines always
 * add up to its net. Margins measured on this agree with the net sales above.
 */
export function netLinesCte(range: AccountingRange): Prisma.Sql {
  return Prisma.sql`net_lines AS (
    SELECT oi."productId", oi."name", oi."quantity", oi."unitCostCents", o."createdAt",
           CASE WHEN SUM(oi."priceCents" * oi."quantity") OVER w > 0
             THEN GREATEST(o."totalCents" - o."discountCents" - ${GST_INSIDE_SQL}, 0)::numeric
                  * oi."priceCents" * oi."quantity"
                  / SUM(oi."priceCents" * oi."quantity") OVER w
             ELSE 0 END AS net_cents
    FROM "order_items" oi
    JOIN "orders" o ON o."id" = oi."orderId"
    WHERE ${IS_SALE_SQL} ${orderPeriodSql(range)}
    WINDOW w AS (PARTITION BY o."id")
  )`;
}

/** Cost and margin over the sold lines, one row. */
export function lineCostSql(range: AccountingRange): Prisma.Sql {
  return Prisma.sql`
    WITH ${netLinesCte(range)}
    SELECT COALESCE(SUM("quantity"), 0)::bigint                                  AS units,
           COUNT(*) FILTER (WHERE "unitCostCents" IS NOT NULL)::bigint           AS "costedLines",
           COUNT(*) FILTER (WHERE "unitCostCents" IS NULL)::bigint               AS "uncostedLines",
           COALESCE(SUM("unitCostCents" * "quantity"), 0)::bigint                AS cogs,
           COALESCE(ROUND(SUM(net_cents) FILTER (WHERE "unitCostCents" IS NOT NULL)), 0)::bigint
                                                                                 AS "costedNet"
    FROM net_lines`;
}

/**
 * Each product's net sales and cost. A deleted product's lines have no id and
 * are kept together under the name they were sold as.
 */
export function productLinesSql(range: AccountingRange): Prisma.Sql {
  return Prisma.sql`
    WITH ${netLinesCte(range)}
    SELECT "productId",
           (ARRAY_AGG("name" ORDER BY "createdAt" DESC))[1]                      AS name,
           SUM("quantity")::bigint                                               AS units,
           ROUND(SUM(net_cents))::bigint                                         AS net,
           COALESCE(ROUND(SUM(net_cents) FILTER (WHERE "unitCostCents" IS NOT NULL)), 0)::bigint
                                                                                 AS "costedNet",
           COALESCE(SUM("unitCostCents" * "quantity"), 0)::bigint                AS cost,
           COUNT(*) FILTER (WHERE "unitCostCents" IS NOT NULL)::bigint           AS "costedLines",
           BOOL_OR("unitCostCents" IS NULL)                                      AS partial
    FROM net_lines
    GROUP BY "productId", CASE WHEN "productId" IS NULL THEN "name" END`;
}
