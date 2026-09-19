import { prisma } from "@/lib/prisma";
import type { RfmFacts } from "./rfm-types";

/**
 * Per-customer recency, frequency and monetary figures.
 *
 * One grouped aggregate rather than loading orders and summing them in
 * JavaScript — the same approach the sales insights take, and for the same
 * reason: the alternative pulls every order the shop has ever taken across
 * the wire to produce three numbers per person.
 *
 * Both channels, always. A counter sale and a web sale are the same Order
 * with a different `source`, and a person who does both is one customer, not
 * two. They are matched on mobile number where there is one, because that is
 * the only identifier the two channels reliably share — a walk-in buyer has
 * no account, and an online buyer's account id means nothing at the counter.
 */
export async function loadRfmFacts(options?: {
  /** Ignore orders before this date. Omit to use the shop's whole history. */
  since?: Date;
}): Promise<RfmFacts[]> {
  const since = options?.since ?? new Date(0);

  const rows = await prisma.$queryRaw<
    {
      customerKey: string;
      name: string | null;
      mobile: string | null;
      lastOrderAt: Date;
      orderCount: bigint;
      totalSpendCents: bigint;
      channels: string[];
    }[]
  >`
    WITH identified AS (
      SELECT
        -- A person is their mobile number where we know it, and their
        -- account otherwise. NULLIF guards against blank strings, which
        -- would otherwise collapse every anonymous walk-in into one
        -- enormous customer.
        COALESCE(
          NULLIF(TRIM(COALESCE(u."mobile", o."customerMobile")), ''),
          o."userId"
        ) AS customer_key,
        COALESCE(NULLIF(TRIM(o."customerName"), ''), u."name") AS name,
        NULLIF(TRIM(COALESCE(u."mobile", o."customerMobile")), '') AS mobile,
        o."createdAt" AS created_at,
        o."source" AS source,
        -- What the customer actually paid, which is what "monetary" means.
        (o."totalCents" + o."shippingCents" + o."codFeeCents"
          + o."taxCents" - o."discountCents") AS paid_cents
      FROM "orders" o
      LEFT JOIN "users" u ON u."id" = o."userId"
      WHERE o."createdAt" >= ${since}
        -- A cancelled or refunded order is not custom; counting it would
        -- make a customer who returned everything look like a good one.
        AND o."status" NOT IN ('CANCELLED', 'REFUNDED')
    )
    SELECT
      customer_key            AS "customerKey",
      MAX(name)               AS "name",
      MAX(mobile)             AS "mobile",
      MAX(created_at)         AS "lastOrderAt",
      COUNT(*)                AS "orderCount",
      SUM(GREATEST(paid_cents, 0)) AS "totalSpendCents",
      ARRAY_AGG(DISTINCT source::text) AS "channels"
    FROM identified
    WHERE customer_key IS NOT NULL
    GROUP BY customer_key
  `;

  return rows.map((row) => ({
    customerKey: row.customerKey,
    name: row.name,
    mobile: row.mobile,
    lastOrderAt: row.lastOrderAt,
    orderCount: Number(row.orderCount),
    totalSpendCents: Number(row.totalSpendCents),
    channels: row.channels.filter(
      (c): c is "STORE" | "ONLINE" => c === "STORE" || c === "ONLINE",
    ),
  }));
}
