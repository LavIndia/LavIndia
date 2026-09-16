"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
import { Switch } from "@/components/ui/switch";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { css } from "styled-system/css";

interface FilterWithCount {
  id: string;
  name: string;
  slug: string;
  type: string;
  isActive: boolean;
  order: number;
  _count: {
    options: number;
    categories: number;
  };
}

const containerStyle = css({
  overflow: "hidden",
  borderRadius: "xl",
  border: "1px solid",
  borderColor: "border.subtle",
  background: "bg.surface",
  boxShadow: "card",
});

const scrollStyle = css({ overflowX: "auto" });

const centerCellStyle = css({ textAlign: "center" });
const rightHeadStyle = css({ textAlign: "right" });
const actionsWidthStyle = css({ width: "6.25rem" });

const emptyCellStyle = css({
  textAlign: "center",
  paddingBlock: "8",
  color: "fg.muted",
});

const nameCellStyle = css({ fontWeight: "medium", color: "fg.default" });

const actionsRowStyle = css({ display: "flex", justifyContent: "flex-end", gap: "2" });

const iconStyle = css({ height: "4", width: "4" });
const deleteIconStyle = css({ height: "4", width: "4", color: "danger" });

export function FiltersTable({ filters }: { filters: FilterWithCount[] }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    setUpdating(id);
    try {
      const res = await fetch(`/api/admin/filters/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      if (!res.ok) throw new Error("Failed to update");

      toast.success("Filter updated successfully");
      router.refresh();
    } catch {
      toast.error("Failed to update filter");
    } finally {
      setUpdating(null);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/filters/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete");

      toast.success("Filter deleted successfully");
      router.refresh();
    } catch {
      toast.error("Failed to delete filter");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <>
      <div className={containerStyle}>
        <div className={scrollStyle}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className={centerCellStyle}>Options</TableHead>
                <TableHead className={centerCellStyle}>Categories</TableHead>
                <TableHead className={actionsWidthStyle}>Active</TableHead>
                <TableHead className={rightHeadStyle}>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filters.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className={emptyCellStyle}>
                    No filters yet. Create one to get started.
                  </TableCell>
                </TableRow>
              ) : (
                filters.map((filter) => (
                  <TableRow key={filter.id}>
                    <TableCell className={nameCellStyle}>{filter.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{filter.type}</Badge>
                    </TableCell>
                    <TableCell className={centerCellStyle}>
                      {filter._count.options}
                    </TableCell>
                    <TableCell className={centerCellStyle}>
                      {filter._count.categories}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={filter.isActive}
                        onCheckedChange={() =>
                          handleToggleActive(filter.id, filter.isActive)
                        }
                        disabled={updating === filter.id}
                        aria-label={`Toggle ${filter.name} active`}
                      />
                    </TableCell>
                    <TableCell className={rightHeadStyle}>
                      <div className={actionsRowStyle}>
                        <Link href={`/admin/filters/${filter.id}/edit`}>
                          <Button variant="ghost" size="sm" aria-label={`Edit ${filter.name}`}>
                            <Pencil className={iconStyle} />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleting(filter.id)}
                          aria-label={`Delete ${filter.name}`}
                        >
                          <Trash2 className={deleteIconStyle} />
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

      <Dialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete filter?</DialogTitle>
            <DialogDescription>
              This will permanently delete the filter and all its options. This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleting && handleDelete(deleting)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
