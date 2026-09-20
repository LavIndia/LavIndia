"use client";

import { Package } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ProfileEmptyState } from "@/components/profile/ProfileEmptyState";
import type { Order } from "@/components/profile/profile-types";
import {
  sectionHeadingStyle,
  statusTone,
  statusToneStyle,
} from "@/components/profile/profile.styles";
import { css } from "styled-system/css";

const headerRowStyle = css({
  display: "flex",
  flexDirection: { base: "column", sm: "row" },
  justifyContent: "space-between",
  alignItems: { base: "flex-start", sm: "flex-start" },
  gap: "3",
});

const listStyle = css({ display: "flex", flexDirection: "column", gap: "4" });
const detailStyle = css({ fontSize: "sm", color: "fg.default" });

export interface OrdersTabProps {
  orders: Order[];
  onStartShopping: () => void;
}

export function OrdersTab({ orders, onStartShopping }: OrdersTabProps) {
  return (
    <>
      <h2 className={sectionHeadingStyle}>Order History</h2>

      {orders.length === 0 ? (
        <ProfileEmptyState
          icon={Package}
          title="No orders yet"
          description="Your order history will appear here"
          actionLabel="Start Shopping"
          onAction={onStartShopping}
        />
      ) : (
        <div className={listStyle}>
          {orders.map((order) => (
            <Card key={order.id}>
              <CardHeader>
                <div className={headerRowStyle}>
                  <div>
                    <CardTitle>Order #{order.orderNumber}</CardTitle>
                    <CardDescription>
                      Placed on {new Date(order.createdAt).toLocaleDateString("en-IN")}
                    </CardDescription>
                  </div>
                  <span className={statusToneStyle({ tone: statusTone(order.status) })}>
                    {order.status}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className={css({ display: "flex", flexDirection: "column", gap: "2" })}>
                  <p className={detailStyle}>
                    <strong>Items:</strong> {order.items.length}
                  </p>
                  <p className={detailStyle}>
                    <strong>Total:</strong> ₹
                    {((order.totalCents || 0) / 100).toLocaleString()}
                  </p>
                  <p className={detailStyle}>
                    <strong>Shipping to:</strong> {order.address.fullName},{" "}
                    {order.address.city}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
