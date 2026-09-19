"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
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
import { Eye, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { css, cx } from "styled-system/css";
import {
  orderCustomerContact,
  orderCustomerName,
} from "@/modules/orders/customer-display";
import { ORDER_STATUSES } from "@/modules/orders/order-filters";
import { OrderCardList } from "./OrderCardList";
import { OrderDetailSheet } from "./OrderDetailSheet";
import {
  ChannelBadge,
  OrderStatusBadge,
  PaymentStatusBadge,
  formatOrderDate,
  formatRupees,
  itemSummary,
  paymentDescription,
} from "./OrderBadges";
import type { OrderRow, OrderStatus } from "./order-types";

const wrapStyle = css({
  overflow: "hidden",
  borderRadius: "xl",
  border: "1px solid",
  borderColor: "border.subtle",
  background: "bg.surface",
  boxShadow: "card",
  display: { base: "none", md: "block" },
});
const emptyCellStyle = css({ textAlign: "center", paddingBlock: "10", color: "fg.muted" });
const nameStyle = css({ fontWeight: "medium", color: "fg.default" });
const subStyle = css({ fontSize: "xs", color: "fg.muted" });
const stackStyle = css({ display: "flex", flexDirection: "column", gap: "0.5", minWidth: 0 });
const numericStyle = css({ fontWeight: "medium", fontVariantNumeric: "tabular-nums" });
const rightStyle = css({ textAlign: "right" });
const actionsStyle = css({ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "1" });
const iconStyle = css({ height: "4", width: "4" });
const spinStyle = css({ height: "3", width: "3", animation: "spin" });
const dashStyle = css({ color: "fg.muted" });

/** The stages a status can actually be moved to, without the "any" option. */
const ASSIGNABLE_STATUSES = ORDER_STATUSES.filter((option) => option.value !== "all");

/**
 * Every order, both channels, one table.
 *
 * The channel is a column rather than a separate screen — see
 * src/modules/orders/order-filters.ts for why. Each row links to its invoice
 * when one has been raised, so going from a sale to the bill handed over is
 * one click and never a search.
 */
export function OrdersTable({ orders }: { orders: OrderRow[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<OrderRow | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const updateStatus = async (orderId: string, status: OrderStatus) => {
    setUpdatingId(orderId);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Order updated");
      router.refresh();
    } catch {
      toast.error("Could not update the order");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <>
      <OrderCardList orders={orders} onSelect={setSelected} />

      <div className={wrapStyle}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Channel</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Items</TableHead>
              <TableHead className={rightStyle}>Value</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className={rightStyle}>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className={emptyCellStyle}>
                  No orders match these filters.
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    <span className={stackStyle}>
                      <span className={nameStyle}>{order.orderNumber}</span>
                      {order.invoice && (
                        <span className={subStyle}>{order.invoice.invoiceNumber}</span>
                      )}
                    </span>
                  </TableCell>

                  <TableCell>
                    <ChannelBadge channel={order.source} />
                  </TableCell>

                  <TableCell>
                    <span className={stackStyle}>
                      <span className={nameStyle}>{orderCustomerName(order)}</span>
                      {orderCustomerContact(order) && (
                        <span className={subStyle}>{orderCustomerContact(order)}</span>
                      )}
                    </span>
                  </TableCell>

                  {/* Pieces, not lines — see itemSummary. */}
                  <TableCell>
                    <span className={stackStyle}>
                      <span className={css({ fontSize: "sm" })}>
                        {itemSummary(order.items).pieces}
                      </span>
                      {itemSummary(order.items).products && (
                        <span className={subStyle}>{itemSummary(order.items).products}</span>
                      )}
                    </span>
                  </TableCell>

                  <TableCell className={cx(numericStyle, rightStyle)}>
                    {formatRupees(order.totalCents)}
                  </TableCell>

                  <TableCell>
                    <span className={stackStyle}>
                      <PaymentStatusBadge status={order.paymentStatus} />
                      <span className={subStyle}>{paymentDescription(order)}</span>
                    </span>
                  </TableCell>

                  <TableCell>
                    {/* A counter sale is finished the moment it is paid — it is
                        handed over across the counter, so there is nothing to
                        advance and a dropdown would only invite a mistake. */}
                    {order.source === "STORE" ? (
                      <OrderStatusBadge status={order.status} />
                    ) : (
                      <Select
                        value={order.status}
                        onValueChange={(value) => updateStatus(order.id, value as OrderStatus)}
                        disabled={updatingId === order.id}
                      >
                        <SelectTrigger className={css({ width: "44" })} aria-label="Order stage">
                          <SelectValue>
                            <span className={css({ display: "flex", alignItems: "center", gap: "1.5" })}>
                              {updatingId === order.id && <Loader2 className={spinStyle} />}
                              <OrderStatusBadge status={order.status} />
                            </span>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {ASSIGNABLE_STATUSES.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </TableCell>

                  <TableCell className={subStyle}>{formatOrderDate(order.createdAt)}</TableCell>

                  <TableCell>
                    <span className={actionsStyle}>
                      {/* Shown only once a bill exists, so the link is never dead. */}
                      {order.invoice ? (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          asChild
                          aria-label={`Invoice ${order.invoice.invoiceNumber}`}
                        >
                          <Link href={`/admin/invoices/${order.id}`} title="Open the invoice">
                            <FileText className={iconStyle} />
                          </Link>
                        </Button>
                      ) : (
                        <span
                          className={dashStyle}
                          title="No invoice yet — one is raised when the sale is settled"
                        >
                          —
                        </span>
                      )}
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setSelected(order)}
                        aria-label={`View ${order.orderNumber}`}
                      >
                        <Eye className={iconStyle} />
                      </Button>
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <OrderDetailSheet order={selected} onClose={() => setSelected(null)} />
    </>
  );
}
