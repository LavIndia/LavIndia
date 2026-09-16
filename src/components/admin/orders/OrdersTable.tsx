"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Search, Eye, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { css, cx } from "styled-system/css";

type OrderStatus =
  | "PENDING"
  | "PROCESSING"
  | "SHIPPED"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED"
  | "REFUNDED";

type PaymentStatus = "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED";

interface Order {
  id: string;
  orderNumber: string;
  totalCents: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: string | null;
  createdAt: Date;
  user: {
    name: string | null;
    email: string | null;
    mobile: string | null;
  };
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    priceCents: number;
  }>;
  address: {
    fullName: string;
    addressLine1: string;
    city: string;
    state: string;
    pincode: string;
  };
}

interface OrdersTableProps {
  orders: Order[];
  searchParams: {
    search?: string;
    status?: string;
    paymentStatus?: string;
  };
}

const filterBarStyle = css({
  display: "flex",
  flexDirection: "column",
  gap: "3",
  borderRadius: "xl",
  border: "1px solid",
  borderColor: "border.subtle",
  background: "bg.surface",
  padding: "3",
  boxShadow: "card",
  lg: { flexDirection: "row", alignItems: "center" },
});

const searchWrapStyle = css({ position: "relative", minWidth: 0, flex: "1" });

const searchIconStyle = css({
  position: "absolute",
  left: "3",
  top: "50%",
  transform: "translateY(-50%)",
  height: "4",
  width: "4",
  color: "fg.muted",
  pointerEvents: "none",
});

const tableWrapStyle = css({
  overflow: "hidden",
  borderRadius: "xl",
  border: "1px solid",
  borderColor: "border.subtle",
  background: "bg.surface",
  boxShadow: "card",
});

const emptyCellStyle = css({
  textAlign: "center",
  paddingBlock: "8",
  color: "fg.muted",
});

const customerNameStyle = css({ fontWeight: "medium", color: "fg.default" });
const customerSubStyle = css({ fontSize: "xs", color: "fg.muted" });
const paymentColStyle = css({ display: "flex", flexDirection: "column", gap: "1" });

const sectionTitleStyle = css({
  fontFamily: "display",
  fontSize: "md",
  fontWeight: "semibold",
  color: "fg.default",
  marginBottom: "2",
});

const infoTextStyle = css({ fontSize: "sm", color: "fg.default" });
const infoMutedStyle = css({ fontSize: "sm", color: "fg.muted" });

const itemRowStyle = css({
  display: "flex",
  justifyContent: "space-between",
  gap: "3",
  fontSize: "sm",
  borderBottom: "1px solid",
  borderColor: "border.subtle",
  paddingBottom: "2",
});

const totalRowStyle = css({
  display: "flex",
  justifyContent: "space-between",
  fontWeight: "bold",
  fontSize: "lg",
  borderTop: "1px solid",
  borderColor: "border.subtle",
  paddingTop: "4",
});

export function OrdersTable({ orders, searchParams }: OrdersTableProps) {
  const router = useRouter();
  const [search, setSearch] = useState(searchParams.search || "");
  const [statusFilter, setStatusFilter] = useState(
    searchParams.status || "all",
  );
  const [paymentFilter, setPaymentFilter] = useState(
    searchParams.paymentStatus || "all",
  );
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (paymentFilter !== "all") params.set("paymentStatus", paymentFilter);
    router.push(`/admin/orders?${params.toString()}`);
  };

  const handleStatusUpdate = async (
    orderId: string,
    newStatus: OrderStatus,
  ) => {
    setUpdatingOrderId(orderId);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) throw new Error("Failed to update");

      toast.success("Order status updated");
      router.refresh();
    } catch {
      toast.error("Failed to update status");
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const formatPrice = (cents: number) => {
    return `₹${(cents / 100).toLocaleString("en-IN")}`;
  };

  const getStatusBadge = (status: OrderStatus) => {
    const config: Record<
      OrderStatus,
      {
        variant: "default" | "secondary" | "destructive" | "outline";
        label: string;
      }
    > = {
      PENDING: { variant: "outline", label: "Pending" },
      PROCESSING: { variant: "secondary", label: "Processing" },
      SHIPPED: { variant: "default", label: "Shipped" },
      OUT_FOR_DELIVERY: { variant: "default", label: "Out for Delivery" },
      DELIVERED: { variant: "default", label: "Delivered" },
      CANCELLED: { variant: "destructive", label: "Cancelled" },
      REFUNDED: { variant: "destructive", label: "Refunded" },
    };

    const { variant, label } = config[status];
    return <Badge variant={variant}>{label}</Badge>;
  };

  const getPaymentBadge = (status: PaymentStatus) => {
    const config: Record<
      PaymentStatus,
      {
        variant: "default" | "secondary" | "destructive" | "outline";
        label: string;
      }
    > = {
      PENDING: { variant: "outline", label: "Pending" },
      COMPLETED: { variant: "default", label: "Paid" },
      FAILED: { variant: "destructive", label: "Failed" },
      REFUNDED: { variant: "secondary", label: "Refunded" },
    };

    const { variant, label } = config[status];
    return <Badge variant={variant}>{label}</Badge>;
  };

  return (
    <>
      <div className={css({ display: "flex", flexDirection: "column", gap: "4" })}>
        {/* Filters */}
        <div className={filterBarStyle}>
          <div className={searchWrapStyle}>
            <Search className={searchIconStyle} />
            <Input
              placeholder="Search by order number, customer name, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className={css({ paddingLeft: "9" })}
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className={css({ width: "full", lg: { width: "45" } })}>
              <SelectValue placeholder="Order Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="PROCESSING">Processing</SelectItem>
              <SelectItem value="SHIPPED">Shipped</SelectItem>
              <SelectItem value="OUT_FOR_DELIVERY">Out for Delivery</SelectItem>
              <SelectItem value="DELIVERED">Delivered</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          <Select value={paymentFilter} onValueChange={setPaymentFilter}>
            <SelectTrigger className={css({ width: "full", lg: { width: "45" } })}>
              <SelectValue placeholder="Payment Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Payments</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="FAILED">Failed</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={handleSearch} className={css({ width: "full", lg: { width: "auto" } })}>
            Apply
          </Button>
        </div>

        {/* Mobile card list — no horizontal scroll, one order per card */}
        <div className={css({ display: { base: "flex", md: "none" }, flexDirection: "column", gap: "3" })}>
          {orders.length === 0 ? (
            <div className={cx(tableWrapStyle, css({ padding: "8", textAlign: "center", color: "fg.muted" }))}>
              No orders found
            </div>
          ) : (
            orders.map((order) => (
              <button
                key={order.id}
                type="button"
                onClick={() => setSelectedOrder(order)}
                className={css({
                  textAlign: "left",
                  borderRadius: "xl",
                  border: "1px solid",
                  borderColor: "border.subtle",
                  background: "bg.surface",
                  boxShadow: "card",
                  padding: "3",
                  display: "flex",
                  flexDirection: "column",
                  gap: "2",
                })}
              >
                <div className={css({ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "2" })}>
                  <div>
                    <p className={css({ fontWeight: "medium", color: "fg.default" })}>{order.orderNumber}</p>
                    <p className={customerSubStyle}>
                      {new Date(order.createdAt).toLocaleDateString("en-IN")} · {order.items.length} items
                    </p>
                  </div>
                  <p className={css({ fontWeight: "medium", color: "fg.default", whiteSpace: "nowrap" })}>
                    {formatPrice(order.totalCents)}
                  </p>
                </div>

                <div>
                  <span className={customerNameStyle}>{order.user.name || "N/A"}</span>
                  <span className={customerSubStyle}> · {order.user.email || order.user.mobile}</span>
                </div>

                <div
                  className={css({
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingTop: "2",
                    borderTop: "1px solid",
                    borderColor: "border.subtle",
                  })}
                >
                  <div className={css({ display: "flex", alignItems: "center", gap: "2" })}>
                    {getPaymentBadge(order.paymentStatus)}
                    {getStatusBadge(order.status)}
                  </div>
                  <Eye className={css({ height: "4", width: "4", color: "fg.muted" })} />
                </div>
              </button>
            ))
          )}
        </div>

        {/* Table — desktop/tablet only */}
        <div className={cx(tableWrapStyle, css({ display: { base: "none", md: "block" } }))}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className={css({ textAlign: "right" })}>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className={emptyCellStyle}>
                    No orders found
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
                        <span className={customerNameStyle}>
                          {order.user.name || "N/A"}
                        </span>
                        <span className={customerSubStyle}>
                          {order.user.email || order.user.mobile}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{order.items.length} items</TableCell>
                    <TableCell className={css({ fontWeight: "medium" })}>
                      {formatPrice(order.totalCents)}
                    </TableCell>
                    <TableCell>
                      <div className={paymentColStyle}>
                        {getPaymentBadge(order.paymentStatus)}
                        <span className={customerSubStyle}>
                          {order.paymentMethod === "cod"
                            ? "Cash on Delivery"
                            : "Online Payment"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={order.status}
                        onValueChange={(value) =>
                          handleStatusUpdate(order.id, value as OrderStatus)
                        }
                        disabled={updatingOrderId === order.id}
                      >
                        <SelectTrigger className={css({ width: "40" })}>
                          <SelectValue>
                            <div className={css({ display: "flex", alignItems: "center", gap: "1.5" })}>
                              {updatingOrderId === order.id && (
                                <Loader2
                                  className={css({ height: "3", width: "3", animation: "spin" })}
                                />
                              )}
                              {getStatusBadge(order.status)}
                            </div>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PENDING">Pending</SelectItem>
                          <SelectItem value="PROCESSING">
                            Processing
                          </SelectItem>
                          <SelectItem value="SHIPPED">Shipped</SelectItem>
                          <SelectItem value="OUT_FOR_DELIVERY">
                            Out for Delivery
                          </SelectItem>
                          <SelectItem value="DELIVERED">Delivered</SelectItem>
                          <SelectItem value="CANCELLED">Cancelled</SelectItem>
                          <SelectItem value="REFUNDED">Refunded</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {new Date(order.createdAt).toLocaleDateString("en-IN")}
                    </TableCell>
                    <TableCell className={css({ textAlign: "right" })}>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setSelectedOrder(order)}
                        aria-label={`View order ${order.orderNumber}`}
                      >
                        <Eye className={css({ height: "4", width: "4" })} />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Order quick-view: a slide-over Sheet instead of a full page nav keeps
          "check an order's items" to a single click, using data already fetched
          for the row. */}
      <Sheet
        open={!!selectedOrder}
        onOpenChange={(open) => !open && setSelectedOrder(null)}
      >
        <SheetContent side="right" className={css({ maxWidth: "28rem" })}>
          <SheetHeader>
            <SheetTitle>Order #{selectedOrder?.orderNumber}</SheetTitle>
            <SheetDescription>
              Placed {selectedOrder && new Date(selectedOrder.createdAt).toLocaleDateString("en-IN")}
            </SheetDescription>
          </SheetHeader>

          {selectedOrder && (
            <div className={css({ display: "flex", flexDirection: "column", gap: "6" })}>
              <div>
                <h3 className={sectionTitleStyle}>Customer</h3>
                <div className={css({ display: "flex", flexDirection: "column", gap: "0.5" })}>
                  <p className={infoTextStyle}>{selectedOrder.user.name}</p>
                  <p className={infoMutedStyle}>{selectedOrder.user.email}</p>
                  <p className={infoMutedStyle}>{selectedOrder.user.mobile}</p>
                </div>
              </div>

              <div>
                <h3 className={sectionTitleStyle}>Shipping Address</h3>
                <div className={infoTextStyle}>
                  <p>{selectedOrder.address.fullName}</p>
                  <p>{selectedOrder.address.addressLine1}</p>
                  <p>
                    {selectedOrder.address.city}, {selectedOrder.address.state}{" "}
                    {selectedOrder.address.pincode}
                  </p>
                </div>
              </div>

              <div>
                <h3 className={sectionTitleStyle}>Order Items</h3>
                <div className={css({ display: "flex", flexDirection: "column", gap: "2" })}>
                  {selectedOrder.items.map((item) => (
                    <div key={item.id} className={itemRowStyle}>
                      <div>
                        <p className={css({ fontWeight: "medium", color: "fg.default" })}>
                          {item.name}
                        </p>
                        <p className={infoMutedStyle}>Qty: {item.quantity}</p>
                      </div>
                      <p className={css({ fontWeight: "medium", color: "fg.default" })}>
                        {formatPrice(item.priceCents * item.quantity)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className={totalRowStyle}>
                <span>Total</span>
                <span>{formatPrice(selectedOrder.totalCents)}</span>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
