import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Package,
  ShoppingCart,
  Users,
  IndianRupee,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { DashboardCharts } from "@/components/admin/dashboard/DashboardCharts";
import { RecentOrders } from "@/components/admin/dashboard/RecentOrders";
import { getSiteSettings } from "@/lib/site-settings";
import { css, cx } from "styled-system/css";

export const dynamic = "force-dynamic";

const pageStyle = css({ display: "flex", flexDirection: "column", gap: "8" });
const titleStyle = css({
  fontFamily: "display",
  fontSize: { base: "2xl", sm: "3xl" },
  fontWeight: "semibold",
  letterSpacing: "tight",
  color: "fg.default",
});
const subtitleStyle = css({ marginTop: "2", fontSize: "sm", color: "fg.muted" });
const statsGridStyle = css({
  display: "grid",
  gap: "4",
  md: { gridTemplateColumns: "repeat(2, 1fr)" },
  lg: { gridTemplateColumns: "repeat(4, 1fr)" },
});
const statCardStyle = css({ borderRadius: "xl" });
const statHeaderStyle = css({
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingBottom: "2",
});
const statLabelStyle = css({ fontSize: "sm", fontWeight: "medium", color: "fg.muted" });
const statIconStyle = css({ height: "4", width: "4", color: "fg.muted" });
const statValueStyle = css({ fontSize: "2xl", fontWeight: "bold", color: "fg.default" });
const statSubRowStyle = css({ marginTop: "1", display: "flex", alignItems: "center", fontSize: "xs" });
const statSubTextStyle = css({ marginTop: "1", fontSize: "xs", color: "fg.muted" });
const trendUpStyle = css({ color: "success" });
const trendDownStyle = css({ color: "danger" });

async function getDashboardStats() {
  const [
    totalProducts,
    activeProducts,
    totalOrders,
    todayOrders,
    totalCustomers,
    totalRevenue,
    previousMonthRevenue,
  ] = await Promise.all([
    prisma.product.count(),
    prisma.product.count({ where: { isActive: true, isPublished: true } }),
    prisma.order.count(),
    prisma.order.count({
      where: {
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    }),
    prisma.user.count({ where: { role: "CUSTOMER" } }),
    prisma.order.aggregate({
      _sum: { totalCents: true },
      where: {
        status: { in: ["PROCESSING", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"] },
      },
    }),
    prisma.order.aggregate({
      _sum: { totalCents: true },
      where: {
        status: { in: ["PROCESSING", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"] },
        createdAt: {
          gte: new Date(new Date().setMonth(new Date().getMonth() - 1)),
          lt: new Date(new Date().setDate(1)),
        },
      },
    }),
  ]);

  const revenue = (totalRevenue._sum.totalCents || 0) / 100;
  const prevRevenue = (previousMonthRevenue._sum.totalCents || 0) / 100;
  const revenueChange =
    prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : 0;

  return {
    totalProducts,
    activeProducts,
    totalOrders,
    todayOrders,
    totalCustomers,
    revenue,
    revenueChange,
  };
}

export default async function AdminDashboard() {
  const [stats, settings] = await Promise.all([
    getDashboardStats(),
    getSiteSettings(),
  ]);

  return (
    <div className={pageStyle}>
      {/* Header */}
      <div>
        <h1 className={titleStyle}>Dashboard</h1>
        <p className={subtitleStyle}>
          Welcome to {settings.businessName} Admin Dashboard
        </p>
      </div>

      {/* Stats Cards */}
      <div className={statsGridStyle}>
        {/* Total Revenue */}
        <Card className={statCardStyle}>
          <CardHeader className={statHeaderStyle}>
            <CardTitle className={statLabelStyle}>Total Revenue</CardTitle>
            <IndianRupee className={statIconStyle} />
          </CardHeader>
          <CardContent>
            <div className={statValueStyle}>
              ₹{stats.revenue.toLocaleString()}
            </div>
            <div className={statSubRowStyle}>
              {stats.revenueChange >= 0 ? (
                <>
                  <TrendingUp className={cx(css({ marginRight: "1", height: "3", width: "3" }), trendUpStyle)} />
                  <span className={trendUpStyle}>
                    +{stats.revenueChange.toFixed(1)}%
                  </span>
                </>
              ) : (
                <>
                  <TrendingDown className={cx(css({ marginRight: "1", height: "3", width: "3" }), trendDownStyle)} />
                  <span className={trendDownStyle}>
                    {stats.revenueChange.toFixed(1)}%
                  </span>
                </>
              )}
              <span className={css({ marginLeft: "1", color: "fg.muted" })}>from last month</span>
            </div>
          </CardContent>
        </Card>

        {/* Orders */}
        <Card className={statCardStyle}>
          <CardHeader className={statHeaderStyle}>
            <CardTitle className={statLabelStyle}>Orders</CardTitle>
            <ShoppingCart className={statIconStyle} />
          </CardHeader>
          <CardContent>
            <div className={statValueStyle}>{stats.totalOrders}</div>
            <p className={statSubTextStyle}>{stats.todayOrders} orders today</p>
          </CardContent>
        </Card>

        {/* Products */}
        <Card className={statCardStyle}>
          <CardHeader className={statHeaderStyle}>
            <CardTitle className={statLabelStyle}>Active Products</CardTitle>
            <Package className={statIconStyle} />
          </CardHeader>
          <CardContent>
            <div className={statValueStyle}>{stats.activeProducts}</div>
            <p className={statSubTextStyle}>
              {stats.totalProducts} total products
            </p>
          </CardContent>
        </Card>

        {/* Customers */}
        <Card className={statCardStyle}>
          <CardHeader className={statHeaderStyle}>
            <CardTitle className={statLabelStyle}>Customers</CardTitle>
            <Users className={statIconStyle} />
          </CardHeader>
          <CardContent>
            <div className={statValueStyle}>{stats.totalCustomers}</div>
            <p className={statSubTextStyle}>Total registered users</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <DashboardCharts />

      {/* Recent Orders */}
      <RecentOrders />
    </div>
  );
}
