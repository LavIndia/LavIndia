"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

type Discount = {
  id: string;
  code: string;
  title: string;
  discountType: string;
  discountValue: number;
  minPurchase: number | null;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  usageLimit: number | null;
  usedCount: number;
};

export function DiscountsTable({ discounts }: { discounts: Discount[] }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this discount?")) return;

    setIsDeleting(id);
    try {
      const response = await fetch(`/api/admin/discounts/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete discount");

      toast.success("Discount deleted successfully");
      router.refresh();
    } catch {
      toast.error("Failed to delete discount");
    } finally {
      setIsDeleting(null);
    }
  };

  const isExpired = (endDate: Date) => new Date(endDate) < new Date();
  const isUpcoming = (startDate: Date) => new Date(startDate) > new Date();

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Discount</TableHead>
              <TableHead>Min Purchase</TableHead>
              <TableHead>Valid Period</TableHead>
              <TableHead>Usage</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {discounts.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center py-8 text-muted-foreground"
                >
                  No discount coupons found. Create your first coupon to get
                  started.
                </TableCell>
              </TableRow>
            ) : (
              discounts.map((discount) => (
                <TableRow key={discount.id} className="hover:bg-muted/40">
                  <TableCell className="font-mono font-bold">
                    {discount.code}
                  </TableCell>
                  <TableCell>{discount.title}</TableCell>
                  <TableCell>
                    {discount.discountType === "PERCENTAGE"
                      ? `${discount.discountValue}%`
                      : `₹${discount.discountValue / 100}`}
                  </TableCell>
                  <TableCell>
                    {discount.minPurchase
                      ? `₹${discount.minPurchase / 100}`
                      : "-"}
                  </TableCell>
                  <TableCell className="text-sm">
                    <div>
                      {format(new Date(discount.startDate), "MMM d, yyyy")}
                    </div>
                    <div className="text-muted-foreground">
                      to {format(new Date(discount.endDate), "MMM d, yyyy")}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {discount.usedCount}
                      {discount.usageLimit ? ` / ${discount.usageLimit}` : ""}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        !discount.isActive
                          ? "secondary"
                          : isExpired(discount.endDate)
                            ? "destructive"
                            : isUpcoming(discount.startDate)
                              ? "outline"
                              : "default"
                      }
                    >
                      {!discount.isActive
                        ? "Inactive"
                        : isExpired(discount.endDate)
                          ? "Expired"
                          : isUpcoming(discount.startDate)
                            ? "Upcoming"
                            : "Active"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          router.push(`/admin/discounts/${discount.id}`)
                        }
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(discount.id)}
                        disabled={isDeleting === discount.id}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
