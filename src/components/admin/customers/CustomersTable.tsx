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
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="overflow-x-auto">
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
                <TableCell
                  colSpan={9}
                  className="text-center py-8 text-muted-foreground"
                >
                  No customers found
                </TableCell>
              </TableRow>
            ) : (
              customers.map((customer) => {
                const tier = getCustomerTier(customer.totalSpent);
                return (
                  <TableRow key={customer.id} className="hover:bg-muted/40">
                    <TableCell className="font-medium">
                      {customer.name || "N/A"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col text-sm">
                        {customer.email && <span>{customer.email}</span>}
                        {customer.mobile && (
                          <span className="text-muted-foreground">
                            {customer.mobile}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{customer.orderCount}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="default" className="bg-green-600">
                        {customer.successfulOrders}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {customer.returnedOrders > 0 ? (
                        <Badge variant="destructive">
                          {customer.returnedOrders}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">0</span>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatPrice(customer.totalSpent)}
                    </TableCell>
                    <TableCell>
                      {customer.totalDiscount > 0 ? (
                        <span className="text-green-600 font-medium">
                          {formatPrice(customer.totalDiscount)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-sm">
                          ₹0
                        </span>
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
    </div>
  );
}
