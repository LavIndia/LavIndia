import { css } from "styled-system/css";
import { prisma } from "@/lib/prisma";
import { AnalyticsHeader } from "@/components/admin/analytics/AnalyticsHeader";
import { AnalyticsCards } from "@/components/admin/analytics/AnalyticsCards";
import { TopProducts } from "@/components/admin/analytics/TopProducts";
import { ProductEngagement } from "@/components/admin/analytics/ProductEngagement";

async function getProductEngagement() {
  const [viewStats, cartCounts] = await Promise.all([
    prisma.productEvent.groupBy({
      by: ["productId"],
      where: { type: "VIEW" },
      _count: { _all: true },
      _avg: { durationMs: true },
      orderBy: { _count: { productId: "desc" } },
      take: 10,
    }),
    prisma.productEvent.groupBy({
      by: ["productId"],
      where: { type: "ADD_TO_CART" },
      _count: { _all: true },
    }),
  ]);

  if (viewStats.length === 0) return [];

  const products = await prisma.product.findMany({
    where: { id: { in: viewStats.map((v) => v.productId) } },
    select: { id: true, name: true },
  });
  const nameById = new Map(products.map((p) => [p.id, p.name]));
  const cartById = new Map(cartCounts.map((c) => [c.productId, c._count._all]));

  return viewStats.map((v) => {
    const views = v._count._all;
    const addsToCart = cartById.get(v.productId) ?? 0;
    return {
      productId: v.productId,
      name: nameById.get(v.productId) ?? "(deleted product)",
      views,
      avgViewSeconds: v._avg.durationMs ? Math.round(v._avg.durationMs / 1000) : 0,
      addsToCart,
      conversionRate: views > 0 ? Math.round((addsToCart / views) * 1000) / 10 : 0,
    };
  });
}

async function getAnalytics() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [totalRevenue, ordersCount, customersCount, topProducts] =
    await Promise.all([
      // Total revenue (same definition as Dashboard: orders past PENDING that
      // weren't cancelled/refunded, regardless of COD vs. online payment status)
      prisma.order.aggregate({
        where: {
          status: { in: ["PROCESSING", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"] },
        },
        _sum: { totalCents: true },
      }),

      // Orders count last 30 days
      prisma.order.count({
        where: {
          createdAt: { gte: thirtyDaysAgo },
        },
      }),

      // New customers last 30 days
      prisma.user.count({
        where: {
          role: "CUSTOMER",
          createdAt: { gte: thirtyDaysAgo },
        },
      }),

      // Top selling products
      prisma.orderItem.groupBy({
        by: ["productId", "name"],
        _sum: {
          quantity: true,
          priceCents: true,
        },
        orderBy: {
          _sum: {
            quantity: "desc",
          },
        },
        take: 10,
      }),
    ]);

  return {
    totalRevenue: totalRevenue._sum.totalCents || 0,
    ordersCount,
    customersCount,
    topProducts: topProducts.map((item) => ({
      productId: item.productId,
      name: item.name,
      quantitySold: item._sum.quantity || 0,
      revenue: item._sum.priceCents || 0,
    })),
  };
}

export default async function AnalyticsPage() {
  const [analytics, engagement] = await Promise.all([
    getAnalytics(),
    getProductEngagement(),
  ]);

  return (
    <div className={css({ display: "flex", flexDirection: "column", gap: "6" })}>
      <AnalyticsHeader />
      <AnalyticsCards
        totalRevenue={analytics.totalRevenue}
        ordersCount={analytics.ordersCount}
        customersCount={analytics.customersCount}
      />
      <TopProducts products={analytics.topProducts} />
      <ProductEngagement products={engagement} />
    </div>
  );
}
