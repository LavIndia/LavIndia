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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { css } from "styled-system/css";

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isFeatured: boolean;
  featuredOrder: number;
  _count: {
    products: number;
  };
}

export function CategoriesTable({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    isFeatured: false,
    featuredOrder: 0,
  });

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      slug: category.slug,
      description: category.description || "",
      isFeatured: category.isFeatured,
      featuredOrder: category.featuredOrder,
    });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/admin/categories/${editingCategory.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error("Failed to update");

      toast.success("Category updated successfully");
      setEditingCategory(null);
      router.refresh();
    } catch {
      toast.error("Failed to update category");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingCategoryId) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/categories/${deletingCategoryId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");

      toast.success("Category deleted successfully");
      router.refresh();
    } catch {
      toast.error("Failed to delete category");
    } finally {
      setDeleting(false);
      setDeletingCategoryId(null);
    }
  };

  return (
    <>
      <div
        className={css({
          overflow: "hidden",
          borderRadius: "xl",
          border: "1px solid",
          borderColor: "border.subtle",
          background: "bg.surface",
          boxShadow: "card",
        })}
      >
        <div className={css({ overflowX: "auto" })}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Products</TableHead>
                <TableHead>Featured</TableHead>
                <TableHead className={css({ textAlign: "right" })}>
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className={css({
                      textAlign: "center",
                      paddingBlock: "8",
                      color: "fg.muted",
                    })}
                  >
                    No categories found
                  </TableCell>
                </TableRow>
              ) : (
                categories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell className={css({ fontWeight: "medium" })}>
                      {category.name}
                    </TableCell>
                    <TableCell className={css({ color: "fg.muted" })}>
                      {category.slug}
                    </TableCell>
                    <TableCell>{category.description || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {category._count.products}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {category.isFeatured ? (
                        <Badge variant="default">
                          Order: {category.featuredOrder}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">No</Badge>
                      )}
                    </TableCell>
                    <TableCell className={css({ textAlign: "right" })}>
                      <div
                        className={css({
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "flex-end",
                          gap: "2",
                        })}
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(category)}
                        >
                          <Pencil className={css({ height: "4", width: "4" })} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeletingCategoryId(category.id)}
                        >
                          <Trash2
                            className={css({ height: "4", width: "4", color: "danger" })}
                          />
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
        open={!!editingCategory}
        onOpenChange={() => setEditingCategory(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleUpdate}
            className={css({ display: "flex", flexDirection: "column", gap: "4" })}
          >
            <div className={css({ display: "flex", flexDirection: "column", gap: "2" })}>
              <Label htmlFor="edit-name">Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
              />
            </div>
            <div className={css({ display: "flex", flexDirection: "column", gap: "2" })}>
              <Label htmlFor="edit-slug">Slug *</Label>
              <Input
                id="edit-slug"
                value={formData.slug}
                onChange={(e) =>
                  setFormData({ ...formData, slug: e.target.value })
                }
                required
              />
            </div>
            <div className={css({ display: "flex", flexDirection: "column", gap: "2" })}>
              <Label htmlFor="edit-description">Description</Label>
              <Input
                id="edit-description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>
            <div className={css({ display: "flex", alignItems: "center", gap: "2" })}>
              <Switch
                id="edit-featured"
                checked={formData.isFeatured}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isFeatured: checked })
                }
              />
              <Label htmlFor="edit-featured">Show in Explore Section</Label>
            </div>
            {formData.isFeatured && (
              <div className={css({ display: "flex", flexDirection: "column", gap: "2" })}>
                <Label htmlFor="edit-featured-order">Featured Order</Label>
                <Input
                  id="edit-featured-order"
                  type="number"
                  value={formData.featuredOrder}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      featuredOrder: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
            )}
            <div className={css({ display: "flex", justifyContent: "flex-end", gap: "2" })}>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingCategory(null)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                Update
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!deletingCategoryId}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setDeletingCategoryId(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete category?</DialogTitle>
            <DialogDescription>
              This will affect all products in this category. This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeletingCategoryId(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleting}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
