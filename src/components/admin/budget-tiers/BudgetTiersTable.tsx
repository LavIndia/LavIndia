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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Edit, Trash2, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { css } from "styled-system/css";

type BudgetTier = {
  id: string;
  title: string;
  maxPrice: number;
  gradient: string | null;
  icon: string | null;
  order: number;
  isActive: boolean;
};

const cardStyle = css({ overflow: "hidden" });
const scrollStyle = css({ overflowX: "auto" });
const emptyCellStyle = css({ textAlign: "center", paddingBlock: "8", color: "fg.muted" });
const orderCellStyle = css({ display: "flex", alignItems: "center", gap: "2" });
const gripIconStyle = css({ height: "4", width: "4", color: "fg.muted" });
const orderNumberStyle = css({ fontWeight: "medium", color: "fg.default" });
const titleCellStyle = css({ fontWeight: "medium", color: "fg.default" });
const gradientSwatchStyle = css({ width: "32", height: "8", borderRadius: "md" });
const mutedTextStyle = css({ color: "fg.muted" });
const actionsCellStyle = css({ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "2" });
const destructiveIconStyle = css({ height: "4", width: "4", color: "danger" });
const iconStyle = css({ height: "4", width: "4" });

export function BudgetTiersTable({ tiers }: { tiers: BudgetTier[] }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const pendingTier = tiers.find((t) => t.id === pendingDeleteId) ?? null;

  const confirmDelete = async () => {
    if (!pendingDeleteId) return;
    const id = pendingDeleteId;
    setPendingDeleteId(null);

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
    <>
      <Card className={cardStyle}>
        <div className={scrollStyle}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className={css({ width: "16" })}>Order</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Max Price</TableHead>
                <TableHead>Gradient</TableHead>
                <TableHead>Icon</TableHead>
                <TableHead className={css({ width: "24" })}>Status</TableHead>
                <TableHead className={css({ width: "24", textAlign: "right" })}>
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tiers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className={emptyCellStyle}>
                    No budget tiers found. Create one to get started.
                  </TableCell>
                </TableRow>
              ) : (
                tiers.map((tier) => (
                  <TableRow key={tier.id}>
                    <TableCell>
                      <div className={orderCellStyle}>
                        <GripVertical className={gripIconStyle} />
                        <span className={orderNumberStyle}>{tier.order}</span>
                      </div>
                    </TableCell>
                    <TableCell className={titleCellStyle}>{tier.title}</TableCell>
                    <TableCell>
                      ₹{(tier.maxPrice / 100).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {tier.gradient ? (
                        <div
                          className={gradientSwatchStyle}
                          style={{ background: tier.gradient }}
                        />
                      ) : (
                        <span className={mutedTextStyle}>-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={mutedTextStyle}>{tier.icon || "-"}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={tier.isActive ? "default" : "secondary"}>
                        {tier.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className={actionsCellStyle}>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Edit ${tier.title}`}
                          onClick={() =>
                            router.push(`/admin/budget-tiers/${tier.id}`)
                          }
                        >
                          <Edit className={iconStyle} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Delete ${tier.title}`}
                          onClick={() => setPendingDeleteId(tier.id)}
                          disabled={isDeleting === tier.id}
                        >
                          <Trash2 className={destructiveIconStyle} />
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

      <Dialog
        open={pendingDeleteId !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteId(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete budget tier?</DialogTitle>
            <DialogDescription>
              {pendingTier
                ? `This will permanently remove "${pendingTier.title}". This action cannot be undone.`
                : "This action cannot be undone."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDeleteId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
