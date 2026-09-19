"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { FileText } from "lucide-react";
import { css } from "styled-system/css";
import {
  orderCustomerContact,
  orderCustomerName,
} from "@/modules/orders/customer-display";
import {
  ChannelBadge,
  OrderStatusBadge,
  PaymentStatusBadge,
  formatOrderDate,
  formatRupees,
  paymentDescription,
} from "./OrderBadges";
import type { OrderRow } from "./order-types";

const columnStyle = css({ display: "flex", flexDirection: "column", gap: "6" });
const badgeRowStyle = css({ display: "flex", alignItems: "center", gap: "2", flexWrap: "wrap" });
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
const moneyRowStyle = css({
  display: "flex",
  justifyContent: "space-between",
  fontSize: "sm",
  color: "fg.muted",
});
const totalRowStyle = css({
  display: "flex",
  justifyContent: "space-between",
  fontWeight: "bold",
  fontSize: "lg",
  borderTop: "1px solid",
  borderColor: "border.subtle",
  paddingTop: "3",
  marginTop: "1",
});
const iconStyle = css({ height: "4", width: "4" });

/**
 * One order, in full.
 *
 * A slide-over rather than a page of its own: checking what is in an order is
 * the commonest thing done on this screen, and everything shown here was
 * already fetched for the row, so opening it costs no further query.
 */
export function OrderDetailSheet({
  order,
  onClose,
}: {
  order: OrderRow | null;
  onClose: () => void;
}) {
  const grandTotal = order
    ? order.totalCents + order.shippingCents + order.taxCents - order.discountCents
    : 0;

  return (
    <Sheet open={!!order} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className={css({ maxWidth: "30rem" })}>
        <SheetHeader>
          <SheetTitle>{order?.orderNumber}</SheetTitle>
          <SheetDescription>
            {order && `Placed ${formatOrderDate(order.createdAt)}`}
          </SheetDescription>
        </SheetHeader>

        {order && (
          <div className={columnStyle}>
            <div className={badgeRowStyle}>
              <ChannelBadge channel={order.source} />
              <OrderStatusBadge status={order.status} />
              <PaymentStatusBadge status={order.paymentStatus} />
            </div>

            {/* Offered only when a bill exists — a COD order has none until
                it is settled, and a dead link would be worse than no link. */}
            {order.invoice && (
              <Button variant="outline" asChild>
                <Link href={`/admin/invoices/${order.id}`}>
                  <FileText className={iconStyle} />
                  Invoice {order.invoice.invoiceNumber}
                </Link>
              </Button>
            )}

            <div>
              <h3 className={sectionTitleStyle}>Customer</h3>
              <p className={infoTextStyle}>{orderCustomerName(order)}</p>
              {orderCustomerContact(order) && (
                <p className={infoMutedStyle}>{orderCustomerContact(order)}</p>
              )}
              {order.user?.email && <p className={infoMutedStyle}>{order.user.email}</p>}
            </div>

            {/* A counter sale is handed over in the shop, so it has no address
                and the section is omitted rather than shown empty. */}
            {order.address && (
              <div>
                <h3 className={sectionTitleStyle}>Shipping to</h3>
                <div className={infoTextStyle}>
                  <p>{order.address.fullName}</p>
                  <p>{order.address.addressLine1}</p>
                  <p>
                    {order.address.city}, {order.address.state} {order.address.pincode}
                  </p>
                </div>
              </div>
            )}

            <div>
              <h3 className={sectionTitleStyle}>Items</h3>
              <div className={css({ display: "flex", flexDirection: "column", gap: "2" })}>
                {order.items.map((item) => (
                  <div key={item.id} className={itemRowStyle}>
                    <div className={css({ minWidth: 0 })}>
                      <p className={css({ fontWeight: "medium", color: "fg.default" })}>
                        {item.name}
                      </p>
                      <p className={infoMutedStyle}>
                        {[
                          item.variantName,
                          item.sku,
                          item.categoryName,
                          `Qty ${item.quantity}`,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    <p
                      className={css({
                        fontWeight: "medium",
                        color: "fg.default",
                        whiteSpace: "nowrap",
                        fontVariantNumeric: "tabular-nums",
                      })}
                    >
                      {formatRupees(item.priceCents * item.quantity)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className={sectionTitleStyle}>Money</h3>
              <div className={css({ display: "flex", flexDirection: "column", gap: "1" })}>
                <div className={moneyRowStyle}>
                  <span>Items</span>
                  <span>{formatRupees(order.totalCents)}</span>
                </div>
                {order.discountCents > 0 && (
                  <div className={moneyRowStyle}>
                    <span>Discount</span>
                    <span>−{formatRupees(order.discountCents)}</span>
                  </div>
                )}
                {order.shippingCents > 0 && (
                  <div className={moneyRowStyle}>
                    <span>Shipping</span>
                    <span>{formatRupees(order.shippingCents)}</span>
                  </div>
                )}
                {order.taxCents > 0 && (
                  <div className={moneyRowStyle}>
                    <span>Tax</span>
                    <span>{formatRupees(order.taxCents)}</span>
                  </div>
                )}
                <div className={moneyRowStyle}>
                  <span>Paid by</span>
                  <span>{paymentDescription(order)}</span>
                </div>
                <div className={totalRowStyle}>
                  <span>Total</span>
                  <span>{formatRupees(grandTotal)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
