import { prisma } from "@/lib/prisma";
import { css } from "styled-system/css";
import {
  orderWhere,
  parseOrderFilters,
  type OrderFilterParams,
} from "@/modules/orders/order-filters";
import { OrdersHeader } from "@/components/admin/orders/OrdersHeader";
import { OrdersFilters } from "@/components/admin/orders/OrdersFilters";
import { OrdersSummaryCards } from "@/components/admin/orders/OrdersSummaryCards";
import { OrdersTable } from "@/components/admin/orders/OrdersTable";
import type { OrderRow, OrdersSummary } from "@/components/admin/orders/order-types";

const pageStyle = css({ display: "flex", flexDirection: "column", gap: "5" });

/** The most recent orders shown at once. */
const PAGE_SIZE = 100;

/**
 * One orders screen, both channels.
 *
 * A walk-in sale and a web sale are the same record with a different
 * `source`, so they share a screen and a query; the channel is a filter and a
 * column, never a separate page. Splitting them would mean two queries over
 * one table and reports that quietly cover only half the business.
 *
 * Three database calls, whatever the filters: the rows, the totals, and the
 * category list. The totals come from a grouped aggregate rather than from
 * summing the rows, so they stay correct when the list is capped.
 */
async function loadOrders(params: OrderFilterParams) {
  const filters = parseOrderFilters(params);
  const where = orderWhere(filters);

  const [rows, grouped, categories] = await Promise.all([
    prisma.order.findMany({
      where,
      select: {
        id: true,
        orderNumber: true,
        totalCents: true,
        shippingCents: true,
        taxCents: true,
        discountCents: true,
        status: true,
        paymentStatus: true,
        paymentMethod: true,
        source: true,
        createdAt: true,
        customerName: true,
        customerMobile: true,
        user: { select: { name: true, email: true, mobile: true } },
        address: {
          select: {
            fullName: true,
            addressLine1: true,
            city: true,
            state: true,
            pincode: true,
          },
        },
        items: {
          select: {
            id: true,
            name: true,
            variantName: true,
            sku: true,
            quantity: true,
            priceCents: true,
            product: { select: { category: { select: { name: true } } } },
          },
        },
        // The instrument the money arrived on, captured at verification.
        payment: { select: { method: true, instrumentDetail: true } },
        // Present once a bill has been raised. Only the number is needed for
        // the row — the invoice page reads its own frozen snapshot.
        invoice: { select: { invoiceNumber: true } },
      },
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
    }),
    prisma.order.groupBy({
      by: ["source"],
      where,
      _count: { _all: true },
      _sum: { totalCents: true },
    }),
    prisma.category.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const orders: OrderRow[] = rows.map((row) => ({
    ...row,
    items: row.items.map(({ product, ...item }) => ({
      ...item,
      categoryName: product?.category?.name ?? null,
    })),
  }));

  const summary: OrdersSummary = {
    orderCount: grouped.reduce((total, group) => total + group._count._all, 0),
    revenueCents: grouped.reduce((total, group) => total + (group._sum.totalCents ?? 0), 0),
    storeCount: grouped.find((group) => group.source === "STORE")?._count._all ?? 0,
    onlineCount: grouped.find((group) => group.source === "ONLINE")?._count._all ?? 0,
  };

  return { filters, orders, summary, categories };
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<OrderFilterParams>;
}) {
  const params = await searchParams;
  const { filters, orders, summary, categories } = await loadOrders(params);

  return (
    <div className={pageStyle}>
      <OrdersHeader shownCount={orders.length} totalCount={summary.orderCount} />
      <OrdersSummaryCards summary={summary} />
      <OrdersFilters initial={filters} categories={categories} />
      <OrdersTable orders={orders} />
    </div>
  );
}
