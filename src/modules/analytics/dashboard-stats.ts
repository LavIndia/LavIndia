import { prisma } from "@/lib/prisma";
import { IS_SALE_SQL, PAID_CENTS_SQL } from "./paid-amount-sql";
import {
  IST_OFFSET_MINUTES,
  istDateKey,
  istDaysAgo,
  istStartOfDay,
  monthToDateComparison,
  percentChange,
} from "./ist-calendar";

/**
 * The dashboard's headline figures.
 *
 * Sales are what clients actually paid (see `paid-amount.ts`) across both
 * channels, counted from orders that are sales — never list prices, never
 * cancelled, refunded or unpaid orders. Dates are India time.
 */
export interface DashboardStats {
  totalProducts: number;
  activeProducts: number;
  totalOrders: number;
  todayOrders: number;
  totalCustomers: number;
  allTimeSalesCents: number;
  monthSalesCents: number;
  /** Change against the same days of last month; null when last month had none. */
  monthChangePct: number | null;
  /** Last month's comparable stretch in words, e.g. "1–14 Sep". */
  comparedWith: string;
}

export async function getDashboardStats(now: Date = new Date()): Promise<DashboardStats> {
  const period = monthToDateComparison(now);
  const [totalProducts, activeProducts, totalOrders, todayOrders, totalCustomers, sales] =
    await Promise.all([
      prisma.product.count(),
      prisma.product.count({ where: { isActive: true, isPublished: true } }),
      prisma.order.count(),
      prisma.order.count({ where: { createdAt: { gte: istStartOfDay(now) } } }),
      prisma.user.count({ where: { role: "CUSTOMER" } }),
      // All three sales figures in one pass over the orders.
      prisma.$queryRaw<Array<{ allTime: bigint; month: bigint; previous: bigint }>>`
        SELECT
          COALESCE(SUM(${PAID_CENTS_SQL}), 0)::bigint AS "allTime",
          COALESCE(SUM(${PAID_CENTS_SQL}) FILTER (
            WHERE o."createdAt" >= ${period.currentFrom}), 0)::bigint AS "month",
          COALESCE(SUM(${PAID_CENTS_SQL}) FILTER (
            WHERE o."createdAt" >= ${period.previousFrom}
              AND o."createdAt" < ${period.previousTo}), 0)::bigint AS "previous"
        FROM "orders" o
        WHERE ${IS_SALE_SQL}`,
    ]);

  const row = sales[0];
  const monthSalesCents = Number(row?.month ?? 0);
  return {
    totalProducts,
    activeProducts,
    totalOrders,
    todayOrders,
    totalCustomers,
    allTimeSalesCents: Number(row?.allTime ?? 0),
    monthSalesCents,
    monthChangePct: percentChange(monthSalesCents, Number(row?.previous ?? 0)),
    comparedWith: period.previousLabel,
  };
}

/**
 * The last seven India-time days: sales paid (in rupees, for the chart) and
 * the number of orders placed, one grouped query.
 */
export async function getSalesChartData(now: Date = new Date()) {
  const from = istDaysAgo(now, 6);
  const rows = await prisma.$queryRaw<Array<{ day: string; orders: bigint; sales: bigint }>>`
    SELECT
      TO_CHAR(o."createdAt" + make_interval(mins => ${IST_OFFSET_MINUTES}::int), 'YYYY-MM-DD') AS day,
      COUNT(*)::bigint AS orders,
      COALESCE(SUM(${PAID_CENTS_SQL}) FILTER (WHERE ${IS_SALE_SQL}), 0)::bigint AS sales
    FROM "orders" o
    WHERE o."createdAt" >= ${from}
    GROUP BY 1`;
  const byDay = new Map(rows.map((r) => [r.day, r]));

  return Array.from({ length: 7 }, (_, i) => {
    const dayStart = new Date(from.getTime() + i * 86_400_000);
    const key = istDateKey(dayStart);
    const row = byDay.get(key);
    return {
      name: new Date(`${key}T00:00:00Z`).toLocaleDateString("en-IN", {
        weekday: "short",
        timeZone: "UTC",
      }),
      sales: Number(row?.sales ?? 0) / 100,
      orders: Number(row?.orders ?? 0),
    };
  });
}
