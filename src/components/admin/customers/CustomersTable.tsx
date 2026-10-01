"use client";

import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AdminPagination } from "@/components/admin/shared/AdminPagination";
import { customerTier, type TierThresholds } from "@/modules/customers/customer-tier";
import { customersQuery, type CustomerFilters } from "@/modules/customers/customer-filters";
import { css } from "styled-system/css";
import { CustomerCardList } from "./CustomerCardList";
import {
  customerHeading,
  emptyCustomersMessage,
  formatJoined,
  formatRupees,
  type CustomerRow,
} from "./customer-display";

interface CustomersTableProps {
  customers: CustomerRow[];
  pagination: { page: number; pageSize: number; totalCount: number; totalPages: number };
  /** The applied search and tier, kept as the list is paged. */
  filters: CustomerFilters;
  thresholds: TierThresholds;
}

const tableWrapStyle = css({
  display: { base: "none", md: "block" },
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

export function CustomersTable({ customers, pagination, filters, thresholds }: CustomersTableProps) {
  const router = useRouter();
  const emptyMessage = emptyCustomersMessage(filters);

  return (
    <div>
      <CustomerCardList customers={customers} thresholds={thresholds} emptyMessage={emptyMessage} />
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
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              customers.map((customer) => {
                const tier = customerTier(customer.totalSpent, thresholds);
                const { title, details } = customerHeading(customer);
                return (
                  <TableRow key={customer.id}>
                    <TableCell className={css({ fontWeight: "medium" })}>{title}</TableCell>
                    <TableCell>
                      <div className={contactColStyle}>
                        {details.map((line, i) => (
                          <span key={line} className={i > 0 ? contactSubStyle : undefined}>
                            {line}
                          </span>
                        ))}
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
                      {formatRupees(customer.totalSpent)}
                    </TableCell>
                    <TableCell>
                      {customer.totalDiscount > 0 ? (
                        <span className={discountTextStyle}>
                          {formatRupees(customer.totalDiscount)}
                        </span>
                      ) : (
                        <span className={zeroTextStyle}>₹0</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={tier.variant}>{tier.label}</Badge>
                    </TableCell>
                    <TableCell>{formatJoined(customer.createdAt)}</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
      <AdminPagination
        {...pagination}
        onPageChange={(page) => {
          const query = customersQuery(filters, page);
          router.push(query ? `/admin/customers?${query}` : "/admin/customers");
        }}
      />
    </div>
  );
}
