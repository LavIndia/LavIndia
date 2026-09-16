import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDistanceToNow } from "date-fns";
import { css } from "styled-system/css";

async function getRecentOrders() {
  const orders = await prisma.order.findMany({
    take: 10,
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: { name: true, email: true },
      },
    },
  });

  return orders;
}

type OrderStatus =
  | "PENDING"
  | "PROCESSING"
  | "SHIPPED"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED"
  | "REFUNDED";

const statusVariant: Record<
  OrderStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  PENDING: "outline",
  PROCESSING: "secondary",
  SHIPPED: "default",
  OUT_FOR_DELIVERY: "default",
  DELIVERED: "default",
  CANCELLED: "destructive",
  REFUNDED: "destructive",
};

const emptyCellStyle = css({ textAlign: "center", paddingBlock: "8", color: "fg.muted" });
const customerSubStyle = css({ fontSize: "xs", color: "fg.muted" });

export async function RecentOrders() {
  const orders = await getRecentOrders();

  return (
    <Card className={css({ borderRadius: "xl" })}>
      <CardHeader>
        <CardTitle>Recent Orders</CardTitle>
      </CardHeader>
      <CardContent className={css({ paddingTop: "0" })}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order ID</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className={emptyCellStyle}>
                  No orders yet
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className={css({ fontWeight: "medium" })}>
                    {order.orderNumber}
                  </TableCell>
                  <TableCell>
                    <div className={css({ display: "flex", flexDirection: "column" })}>
                      <span className={css({ fontWeight: "medium" })}>{order.user.name}</span>
                      <span className={customerSubStyle}>{order.user.email}</span>
                    </div>
                  </TableCell>
                  <TableCell className={css({ fontWeight: "medium" })}>
                    ₹{(order.totalCents / 100).toLocaleString("en-IN")}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[order.status as OrderStatus]}>
                      {order.status}
                    </Badge>
                  </TableCell>
                  <TableCell className={customerSubStyle}>
                    {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
