import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { resolvePeriod, type InsightsPeriod } from "./insight-periods";
import { IST_OFFSET_MINUTES } from "./ist-calendar";
import { IS_SALE_SQL, PAID_CENTS_SQL, chargedLinesCte } from "./paid-amount-sql";
import { paymentMethodLabel } from "@/modules/orders/order-labels";

export {
  INSIGHT_PERIODS,
  resolvePeriod,
  type InsightPeriodValue,
  type InsightsPeriod,
} from "./insight-periods";

/**
 * Everything the current data can honestly answer about sales.
 *
 * Both channels, always. A counter sale and a web sale are the same record
 * with a different `source`, so every figure here covers the whole business
 * and the channel is a dimension rather than a filter someone has to remember
 * to switch off. A dashboard that quietly reported only online orders would
 * understate the shop.
 *
 * Written as a small number of grouped SQL aggregates rather than by loading
 * orders and summing them in JavaScript: the database is far better at this,
 * and the alternative is pulling every order in the period across the wire to
 * add up nine numbers.
 */

export interface ChannelTotals {
  source: "STORE" | "ONLINE";
  orders: number;
  revenueCents: number;
  pieces: number;
}

export interface ProductSales {
  productId: string;
  name: string;
  categoryName: string | null;
  pieces: number;
  revenueCents: number;
  storePieces: number;
  onlinePieces: number;
}

export interface NamedTotals {
  name: string;
  orders: number;
  pieces: number;
  revenueCents: number;
}

export interface DayTotals {
  day: string;
  storeRevenueCents: number;
  onlineRevenueCents: number;
}

export interface LowStockItem {
  productName: string;
  sku: string | null;
  available: number;
  reorderPoint: number;
}

export interface SalesInsights {
  period: InsightsPeriod;
  channels: ChannelTotals[];
  totals: { orders: number; revenueCents: number; pieces: number; averageCents: number };
  topProducts: ProductSales[];
  categories: NamedTotals[];
  paymentMix: NamedTotals[];
  daily: DayTotals[];
  topCustomers: NamedTotals[];
  lowStock: LowStockItem[];
  /** Sales that have been settled but never given a bill — see BACKLOG #10. */
  missingInvoices: number;
}

/**
 * A stored payment value → the admin's words.
 *
 * The raw values are inconsistent by channel — the counter writes `CASH`, the
 * website writes `cod` and `razorpay` — and a dashboard that prints those
 * verbatim reads like a database dump rather than a summary of the day.
 */
function byInstrument(rows: NamedTotals[]): NamedTotals[] {
  // Labelled by the shared map, then merged: a counter "UPI" and a gateway
  // "upi" are the same instrument and belong on one row.
  const merged = new Map<string, NamedTotals>();
  for (const row of rows) {
    const name = paymentMethodLabel(row.name) || "Unknown";
    const seen = merged.get(name);
    merged.set(
      name,
      seen
        ? {
            name,
            orders: seen.orders + row.orders,
            pieces: seen.pieces + row.pieces,
            revenueCents: seen.revenueCents + row.revenueCents,
          }
        : { ...row, name },
    );
  }
  return [...merged.values()].sort((x, y) => y.revenueCents - x.revenueCents);
}

/**
 * Only sales count: cancelled, refunded and still-unpaid (Pending) orders
 * never do. Every revenue figure is what clients actually paid, GST counted
 * once — see `paid-amount.ts` — so these agree with the Dashboard.
 */
const COUNTED_STATUSES = IS_SALE_SQL;

function since(from: Date | null) {
  return from ? Prisma.sql`AND o."createdAt" >= ${from}` : Prisma.empty;
}

/** All of it, in one round of parallel aggregates. */
export async function getSalesInsights(periodValue: string): Promise<SalesInsights> {
  const period = resolvePeriod(periodValue);
  const window = since(period.from);

  const [channels, topProducts, categories, paymentMix, daily, topCustomers, lowStock, missing] =
    await Promise.all([
      prisma.$queryRaw<Array<{ source: "STORE" | "ONLINE"; orders: bigint; revenue: bigint | null; pieces: bigint | null }>>`
        SELECT o."source" AS source,
               COUNT(*) AS orders,
               SUM(${PAID_CENTS_SQL}) AS revenue,
               SUM((SELECT SUM(oi."quantity") FROM "order_items" oi WHERE oi."orderId" = o."id")) AS pieces
        FROM "orders" o
        WHERE ${COUNTED_STATUSES} ${window}
        GROUP BY o."source"`,

      prisma.$queryRaw<Array<{ productId: string; name: string; categoryName: string | null; pieces: bigint; revenue: bigint; storePieces: bigint; onlinePieces: bigint }>>`
        WITH ${chargedLinesCte(window)}
        SELECT oi."productId"                     AS "productId",
               MIN(oi."name")                     AS name,
               MIN(c."name")                      AS "categoryName",
               SUM(oi."quantity")                 AS pieces,
               ROUND(SUM(oi.charged_cents))::bigint AS revenue,
               SUM(CASE WHEN oi."source" = 'STORE'  THEN oi."quantity" ELSE 0 END) AS "storePieces",
               SUM(CASE WHEN oi."source" = 'ONLINE' THEN oi."quantity" ELSE 0 END) AS "onlinePieces"
        FROM charged_lines oi
        LEFT JOIN "products"   p ON p."id" = oi."productId"
        LEFT JOIN "categories" c ON c."id" = p."categoryId"
        GROUP BY oi."productId"
        ORDER BY pieces DESC, revenue DESC
        LIMIT 10`,

      prisma.$queryRaw<Array<{ name: string; orders: bigint; pieces: bigint; revenue: bigint }>>`
        WITH ${chargedLinesCte(window)}
        SELECT COALESCE(c."name", 'Uncategorised') AS name,
               COUNT(DISTINCT oi."orderId")        AS orders,
               SUM(oi."quantity")                  AS pieces,
               ROUND(SUM(oi.charged_cents))::bigint AS revenue
        FROM charged_lines oi
        LEFT JOIN "products"   p ON p."id" = oi."productId"
        LEFT JOIN "categories" c ON c."id" = p."categoryId"
        GROUP BY c."name"
        ORDER BY revenue DESC`,

      // The instrument when it is known, falling back to the route chosen at
      // checkout for orders placed before it was captured.
      prisma.$queryRaw<Array<{ name: string; orders: bigint; pieces: bigint; revenue: bigint }>>`
        SELECT COALESCE(pay."method", o."paymentMethod", 'Unknown') AS name,
               COUNT(DISTINCT o."id")                               AS orders,
               0::bigint                                            AS pieces,
               SUM(${PAID_CENTS_SQL})                               AS revenue
        FROM "orders" o
        LEFT JOIN "payments" pay ON pay."orderId" = o."id"
        WHERE ${COUNTED_STATUSES} ${window}
        GROUP BY COALESCE(pay."method", o."paymentMethod", 'Unknown')
        ORDER BY revenue DESC`,

      // Grouped by the India-time calendar day, whatever the server's zone.
      prisma.$queryRaw<Array<{ day: string; store: bigint; online: bigint }>>`
        SELECT TO_CHAR(o."createdAt" + make_interval(mins => ${IST_OFFSET_MINUTES}::int),
                       'YYYY-MM-DD')                                                   AS day,
               SUM(CASE WHEN o."source" = 'STORE'  THEN ${PAID_CENTS_SQL} ELSE 0 END)  AS store,
               SUM(CASE WHEN o."source" = 'ONLINE' THEN ${PAID_CENTS_SQL} ELSE 0 END)  AS online
        FROM "orders" o
        WHERE ${COUNTED_STATUSES} ${window}
        GROUP BY 1
        ORDER BY 1 ASC`,

      // Walk-in sales are included: an unnamed counter sale groups under one
      // "Walk-in customer" row rather than being dropped from the ranking.
      prisma.$queryRaw<Array<{ name: string; orders: bigint; pieces: bigint; revenue: bigint }>>`
        SELECT COALESCE(u."name", o."customerName", 'Walk-in customer') AS name,
               COUNT(DISTINCT o."id")                                   AS orders,
               0::bigint                                                AS pieces,
               SUM(${PAID_CENTS_SQL})                                   AS revenue
        FROM "orders" o
        LEFT JOIN "users" u ON u."id" = o."userId"
        WHERE ${COUNTED_STATUSES} ${window}
        GROUP BY COALESCE(u."name", o."customerName", 'Walk-in customer')
        ORDER BY revenue DESC
        LIMIT 8`,

      // Not period-scoped: what needs reordering is a fact about now.
      prisma.$queryRaw<Array<{ productName: string; sku: string | null; available: number; reorderPoint: number }>>`
        SELECT p."name"                                  AS "productName",
               v."sku"                                   AS sku,
               (l."quantity" - l."reservedQuantity")     AS available,
               v."reorderPoint"                          AS "reorderPoint"
        FROM "inventory_levels" l
        JOIN "product_variants" v ON v."id" = l."variantId"
        JOIN "products" p         ON p."id" = v."productId"
        WHERE (l."quantity" - l."reservedQuantity") <= v."reorderPoint"
          -- A retired piece will never be reordered, so running out is expected.
          AND p."retiredAt" IS NULL
        ORDER BY (l."quantity" - l."reservedQuantity") ASC, p."name" ASC
        LIMIT 12`,

      prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) AS count
        FROM "orders" o
        LEFT JOIN "invoices" i ON i."orderId" = o."id"
        WHERE i."id" IS NULL
          AND o."paymentStatus" = 'COMPLETED'
          AND ${COUNTED_STATUSES} ${window}`,
    ]);

  const toNumber = (value: bigint | number | null) => Number(value ?? 0);

  const channelTotals: ChannelTotals[] = channels.map((row) => ({
    source: row.source,
    orders: toNumber(row.orders),
    revenueCents: toNumber(row.revenue),
    pieces: toNumber(row.pieces),
  }));

  const orders = channelTotals.reduce((sum, row) => sum + row.orders, 0);
  const revenueCents = channelTotals.reduce((sum, row) => sum + row.revenueCents, 0);
  const pieces = channelTotals.reduce((sum, row) => sum + row.pieces, 0);

  const named = (rows: Array<{ name: string; orders: bigint; pieces: bigint; revenue: bigint }>) =>
    rows.map((row) => ({
      name: row.name,
      orders: toNumber(row.orders),
      pieces: toNumber(row.pieces),
      revenueCents: toNumber(row.revenue),
    }));

  return {
    period,
    channels: channelTotals,
    totals: {
      orders,
      revenueCents,
      pieces,
      averageCents: orders > 0 ? Math.round(revenueCents / orders) : 0,
    },
    topProducts: topProducts.map((row) => ({
      productId: row.productId,
      name: row.name,
      categoryName: row.categoryName,
      pieces: toNumber(row.pieces),
      revenueCents: toNumber(row.revenue),
      storePieces: toNumber(row.storePieces),
      onlinePieces: toNumber(row.onlinePieces),
    })),
    categories: named(categories),
    paymentMix: byInstrument(named(paymentMix)),
    daily: daily.map((row) => ({
      day: row.day,
      storeRevenueCents: toNumber(row.store),
      onlineRevenueCents: toNumber(row.online),
    })),
    topCustomers: named(topCustomers),
    lowStock: lowStock.map((row) => ({
      productName: row.productName,
      sku: row.sku,
      available: Number(row.available),
      reorderPoint: Number(row.reorderPoint),
    })),
    missingInvoices: Number(missing[0]?.count ?? 0),
  };
}
