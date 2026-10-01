import { prisma } from "@/lib/prisma";
import type { OrderStatus } from "@prisma/client";
import { getDashboardStats, getSalesChartData } from "@/modules/analytics/dashboard-stats";
import { SalesStatCard } from "@/components/admin/dashboard/SalesStatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, ShoppingCart, Users } from "lucide-react";
import { DashboardCharts } from "@/components/admin/dashboard/DashboardCharts";
import { RecentOrders } from "@/components/admin/dashboard/RecentOrders";
import { getSiteSettings } from "@/lib/site-settings";
import { ORDER_STATUS_LABELS } from "@/modules/orders/order-labels";
import { css } from "styled-system/css";

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
const statSubTextStyle = css({ marginTop: "1", fontSize: "xs", color: "fg.muted" });

async function getOrderStatusData() {
  const grouped = await prisma.order.groupBy({
    by: ["status"],
    _count: { _all: true },
  });
  const countByStatus = new Map(grouped.map((g) => [g.status, g._count._all]));

  // Words from the shared label map, so the chart reads as the Orders screen does.
  return (Object.keys(ORDER_STATUS_LABELS) as OrderStatus[]).map((status) => ({
    status: ORDER_STATUS_LABELS[status],
    count: countByStatus.get(status) ?? 0,
  }));
}

export default async function AdminDashboard() {
  const [stats, settings, salesData, orderStatusData] = await Promise.all([
    getDashboardStats(),
    getSiteSettings(),
    getSalesChartData(),
    getOrderStatusData(),
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
        <SalesStatCard
          monthSalesCents={stats.monthSalesCents}
          monthChangePct={stats.monthChangePct}
          comparedWith={stats.comparedWith}
          allTimeSalesCents={stats.allTimeSalesCents}
        />

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
      <DashboardCharts salesData={salesData} orderStatusData={orderStatusData} />

      {/* Recent Orders */}
      <RecentOrders />
    </div>
  );
}
