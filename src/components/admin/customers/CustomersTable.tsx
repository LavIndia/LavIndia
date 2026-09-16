"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { css } from "styled-system/css";

interface Customer {
  id: string;
  name: string | null;
  email: string | null;
  mobile: string | null;
  createdAt: Date;
  orderCount: number;
  totalSpent: number;
  successfulOrders: number;
  returnedOrders: number;
  totalDiscount: number;
}

interface CustomersTableProps {
  customers: Customer[];
}

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

const contactColStyle = css({ display: "flex", flexDirection: "column", fontSize: "sm" });
const contactSubStyle = css({ color: "fg.muted" });

const successBadgeStyle = css({
  background: "success",
  color: "white",
});

const zeroTextStyle = css({ fontSize: "sm", color: "fg.muted" });
const discountTextStyle = css({ color: "success", fontWeight: "medium" });

export function CustomersTable({ customers }: CustomersTableProps) {
  const formatPrice = (cents: number) => {
    return `₹${(cents / 100).toLocaleString("en-IN")}`;
  };

  const getCustomerTier = (totalSpent: number) => {
    if (totalSpent >= 50000 * 100)
      return { label: "VIP", variant: "default" as const };
    if (totalSpent >= 20000 * 100)
      return { label: "Gold", variant: "secondary" as const };
    if (totalSpent >= 5000 * 100)
      return { label: "Silver", variant: "outline" as const };
    return { label: "Regular", variant: "outline" as const };
  };

  return (
    <div className={tableWrapStyle}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Total Orders</TableHead>
            <TableHead>Successful</TableHead>
            <TableHead>Returned</TableHead>
            <TableHead>Total Spent</TableHead>
            <TableHead>Discount Saved</TableHead>
            <TableHead>Tier</TableHead>
            <TableHead>Joined</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className={emptyCellStyle}>
                No customers found
              </TableCell>
            </TableRow>
          ) : (
            customers.map((customer) => {
              const tier = getCustomerTier(customer.totalSpent);
              return (
                <TableRow key={customer.id}>
                  <TableCell className={css({ fontWeight: "medium" })}>
                    {customer.name || "N/A"}
                  </TableCell>
                  <TableCell>
                    <div className={contactColStyle}>
                      {customer.email && <span>{customer.email}</span>}
                      {customer.mobile && (
                        <span className={contactSubStyle}>{customer.mobile}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{customer.orderCount}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="default" className={successBadgeStyle}>
                      {customer.successfulOrders}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {customer.returnedOrders > 0 ? (
                      <Badge variant="destructive">{customer.returnedOrders}</Badge>
                    ) : (
                      <span className={zeroTextStyle}>0</span>
                    )}
                  </TableCell>
                  <TableCell className={css({ fontWeight: "medium" })}>
                    {formatPrice(customer.totalSpent)}
                  </TableCell>
                  <TableCell>
                    {customer.totalDiscount > 0 ? (
                      <span className={discountTextStyle}>
                        {formatPrice(customer.totalDiscount)}
                      </span>
                    ) : (
                      <span className={zeroTextStyle}>₹0</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={tier.variant}>{tier.label}</Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(customer.createdAt).toLocaleDateString("en-IN")}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
