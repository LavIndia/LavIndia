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

export const dynamic = "force-dynamic";

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
        status: { in: ["PROCESSING", "SHIPPED", "DELIVERED"] },
      },
    }),
    prisma.order.aggregate({
      _sum: { totalCents: true },
      where: {
        status: { in: ["PROCESSING", "SHIPPED", "DELIVERED"] },
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
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Dashboard
        </h1>
        <p className="mt-2 text-muted-foreground">
          Welcome to {settings.businessName} Admin Dashboard
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Revenue */}
        <Card className="rounded-xl shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Revenue
            </CardTitle>
            <IndianRupee className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{stats.revenue.toLocaleString()}
            </div>
            <div className="mt-1 flex items-center text-xs">
              {stats.revenueChange >= 0 ? (
                <>
                  <TrendingUp className="mr-1 h-3 w-3 text-green-500" />
                  <span className="text-green-500">
                    +{stats.revenueChange.toFixed(1)}%
                  </span>
                </>
              ) : (
                <>
                  <TrendingDown className="mr-1 h-3 w-3 text-red-500" />
                  <span className="text-red-500">
                    {stats.revenueChange.toFixed(1)}%
                  </span>
                </>
              )}
              <span className="ml-1 text-gray-500">from last month</span>
            </div>
          </CardContent>
        </Card>

        {/* Orders */}
        <Card className="rounded-xl shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Orders
            </CardTitle>
            <ShoppingCart className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrders}</div>
            <p className="mt-1 text-xs text-gray-500">
              {stats.todayOrders} orders today
            </p>
          </CardContent>
        </Card>

        {/* Products */}
        <Card className="rounded-xl shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Active Products
            </CardTitle>
            <Package className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeProducts}</div>
            <p className="mt-1 text-xs text-gray-500">
              {stats.totalProducts} total products
            </p>
          </CardContent>
        </Card>

        {/* Customers */}
        <Card className="rounded-xl shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Customers
            </CardTitle>
            <Users className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCustomers}</div>
            <p className="mt-1 text-xs text-gray-500">Total registered users</p>
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
