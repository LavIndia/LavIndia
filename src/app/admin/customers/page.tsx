import { prisma } from "@/lib/prisma";
import { CustomersTable } from "@/components/admin/customers/CustomersTable";
import { CustomersHeader } from "@/components/admin/customers/CustomersHeader";
import { css } from "styled-system/css";

const pageStyle = css({ display: "flex", flexDirection: "column", gap: "6" });

async function getCustomers() {
  const customers = await prisma.user.findMany({
    where: { role: "CUSTOMER" },
    include: {
      orders: {
        take: 100,
        select: {
          paymentStatus: true,
          status: true,
          totalCents: true,
          items: {
            select: {
              priceCents: true,
              quantity: true,
              product: {
                select: {
                  priceCents: true,
                  compareAtCents: true,
                },
              },
            },
          },
        },
      },
      _count: {
        select: { orders: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return customers.map((customer) => {
    // Same definition as Dashboard/Analytics revenue: orders past PENDING that
    // weren't cancelled/refunded, regardless of COD vs. online payment status.
    const completedOrders = customer.orders.filter((order) =>
      ["PROCESSING", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"].includes(
        order.status,
      ),
    );

    const successfulOrders = customer.orders.filter(
      (order) =>
        order.status === "DELIVERED" ||
        order.status === "SHIPPED" ||
        order.status === "OUT_FOR_DELIVERY",
    );

    const returnedOrders = customer.orders.filter(
      (order) => order.status === "REFUNDED" || order.status === "CANCELLED",
    );

    const totalSpent = completedOrders.reduce(
      (sum, order) => sum + order.totalCents,
      0,
    );

    const totalDiscount = completedOrders.reduce((sum, order) => {
      const orderDiscount = order.items.reduce((itemSum, item) => {
        const comparePrice =
          item.product.compareAtCents || item.product.priceCents;
        const discount = (comparePrice - item.priceCents) * item.quantity;
        return itemSum + (discount > 0 ? discount : 0);
      }, 0);
      return sum + orderDiscount;
    }, 0);

    return {
      ...customer,
      totalSpent,
      orderCount: customer._count.orders,
      successfulOrders: successfulOrders.length,
      returnedOrders: returnedOrders.length,
      totalDiscount,
    };
  });
}

export default async function CustomersPage() {
  const customers = await getCustomers();

  return (
    <div className={pageStyle}>
      <CustomersHeader />
      <CustomersTable customers={customers} />
    </div>
  );
}
