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
import { Card } from "@/components/ui/card";
import { Edit, Trash2, GripVertical } from "lucide-react";
import { toast } from "sonner";

type BudgetTier = {
  id: string;
  title: string;
  maxPrice: number;
  gradient: string | null;
  icon: string | null;
  order: number;
  isActive: boolean;
};

export function BudgetTiersTable({ tiers }: { tiers: BudgetTier[] }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this tier?")) return;

    setIsDeleting(id);
    try {
      const response = await fetch(`/api/admin/budget-tiers/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete tier");

      toast.success("Budget tier deleted successfully");
      router.refresh();
    } catch {
      toast.error("Failed to delete tier");
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <Card className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px]">Order</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Max Price</TableHead>
              <TableHead>Gradient</TableHead>
              <TableHead>Icon</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="w-[100px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tiers.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center py-8 text-muted-foreground"
                >
                  No budget tiers found. Create one to get started.
                </TableCell>
              </TableRow>
            ) : (
              tiers.map((tier) => (
                <TableRow key={tier.id} className="hover:bg-muted/40">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{tier.order}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{tier.title}</TableCell>
                  <TableCell>
                    ₹{(tier.maxPrice / 100).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    {tier.gradient ? (
                      <div
                        className="w-32 h-8 rounded"
                        style={{ background: tier.gradient }}
                      />
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-muted-foreground">
                      {tier.icon || "-"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={tier.isActive ? "default" : "secondary"}>
                      {tier.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          router.push(`/admin/budget-tiers/${tier.id}`)
                        }
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(tier.id)}
                        disabled={isDeleting === tier.id}
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
    </Card>
  );
}
