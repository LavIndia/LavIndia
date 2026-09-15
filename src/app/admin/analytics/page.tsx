import { prisma } from "@/lib/prisma";
import { AnalyticsHeader } from "@/components/admin/analytics/AnalyticsHeader";
import { AnalyticsCards } from "@/components/admin/analytics/AnalyticsCards";
import { TopProducts } from "@/components/admin/analytics/TopProducts";

async function getAnalytics() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [totalRevenue, ordersCount, customersCount, topProducts] =
    await Promise.all([
      // Total revenue (completed orders)
      prisma.order.aggregate({
        where: { paymentStatus: "COMPLETED" },
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
  const analytics = await getAnalytics();

  return (
    <div className="space-y-6">
      <AnalyticsHeader />
      <AnalyticsCards
        totalRevenue={analytics.totalRevenue}
        ordersCount={analytics.ordersCount}
        customersCount={analytics.customersCount}
      />
      <TopProducts products={analytics.topProducts} />
    </div>
  );
}
