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
} from "@/components/ui/dialog";

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
      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-center">Options</TableHead>
                <TableHead className="text-center">Categories</TableHead>
                <TableHead className="w-[100px]">Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filters.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-8 text-gray-500"
                  >
                    No filters yet. Create one to get started.
                  </TableCell>
                </TableRow>
              ) : (
                filters.map((filter) => (
                  <TableRow key={filter.id} className="hover:bg-muted/40">
                    <TableCell className="font-medium">{filter.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{filter.type}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {filter._count.options}
                    </TableCell>
                    <TableCell className="text-center">
                      {filter._count.categories}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={filter.isActive}
                        onCheckedChange={() =>
                          handleToggleActive(filter.id, filter.isActive)
                        }
                        disabled={updating === filter.id}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Link href={`/admin/filters/${filter.id}/edit`}>
                          <Button variant="ghost" size="sm">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleting(filter.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
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
            <DialogTitle>Delete Filter</DialogTitle>
            <DialogDescription>
              Are you sure? This will delete the filter and all its options.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => deleting && handleDelete(deleting)}
              className="bg-red-500 hover:bg-red-600"
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
