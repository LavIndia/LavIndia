import { prisma } from "@/lib/prisma";
import { OrdersTable } from "@/components/admin/orders/OrdersTable";
import { OrdersHeader } from "@/components/admin/orders/OrdersHeader";
import { css } from "styled-system/css";

const pageStyle = css({ display: "flex", flexDirection: "column", gap: "6" });

async function getOrders(searchParams: {
  search?: string;
  status?: string;
  paymentStatus?: string;
}) {
  const { search, status, paymentStatus } = searchParams;

  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { orderNumber: { contains: search, mode: "insensitive" } },
      { user: { email: { contains: search, mode: "insensitive" } } },
      { user: { name: { contains: search, mode: "insensitive" } } },
    ];
  }

  if (status && status !== "all") {
    where.status = status;
  }

  if (paymentStatus && paymentStatus !== "all") {
    where.paymentStatus = paymentStatus;
  }

  const orders = await prisma.order.findMany({
    where,
    include: {
      user: {
        select: {
          name: true,
          email: true,
          mobile: true,
        },
      },
      items: {
        select: {
          id: true,
          name: true,
          quantity: true,
          priceCents: true,
        },
      },
      address: true,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return orders;
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    status?: string;
    paymentStatus?: string;
  }>;
}) {
  const params = await searchParams;
  const orders = await getOrders(params);

  return (
    <div className={pageStyle}>
      <OrdersHeader />
      <OrdersTable orders={orders} searchParams={params} />
    </div>
  );
}
