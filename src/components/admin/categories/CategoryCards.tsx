"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Crown,
  GripVertical,
  Pencil,
  Star,
  Trash2,
  Upload,
  Loader2,
} from "lucide-react";
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
import { CategoryProductsDialog } from "./CategoryProductsDialog";
import { css, cx } from "styled-system/css";

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  isFeatured: boolean;
  featuredOrder: number;
  _count: {
    products: number;
  };
}

const gridStyle = css({
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  gap: "3",
  sm: { gridTemplateColumns: "repeat(3, 1fr)", gap: "5" },
  lg: { gridTemplateColumns: "repeat(4, 1fr)" },
});

const cardWrapperStyle = css({ position: "relative" });

const cardStyle = css({
  display: "flex",
  flexDirection: "column",
  borderRadius: { base: "lg", sm: "xl" },
  overflow: "hidden",
  border: "1px solid",
  borderColor: "border.subtle",
  background: "bg.surface",
  boxShadow: "card",
  cursor: "grab",
  transition: "box-shadow 0.15s ease, opacity 0.15s ease",
  "&:hover": { boxShadow: "cardHover" },
});

const primaryBadgeStyle = css({
  position: "absolute",
  top: { base: "-2.5", sm: "-3" },
  left: "50%",
  transform: "translateX(-50%)",
  zIndex: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  height: { base: "6", sm: "7" },
  width: { base: "6", sm: "7" },
  borderRadius: "full",
  background: "linear-gradient(135deg, token(colors.gold.400), token(colors.gold.600))",
  color: "white",
  boxShadow: "0 3px 8px rgba(20,16,8,0.35)",
  border: "2px solid",
  borderColor: "bg.canvas",
  pointerEvents: "none",
});

const cardDraggingStyle = css({ opacity: 0.5 });

const imageBoxStyle = css({
  position: "relative",
  aspectRatio: { base: "1 / 1", sm: "4 / 3" },
  background: "gold.50",
  overflow: "hidden",
});

const imageStyle = css({
  height: "full",
  width: "full",
  objectFit: "cover",
});

const emptyImageStyle = css({
  height: "full",
  width: "full",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "1.5",
  color: "gold.600",
  border: "2px dashed",
  borderColor: "gold.300",
});

const overlayStyle = css({
  position: "absolute",
  insetInline: 0,
  bottom: 0,
  paddingInline: { base: "2", sm: "3.5" },
  paddingBlock: { base: "2", sm: "3" },
  background: "linear-gradient(to top, rgba(20,16,8,0.78), rgba(20,16,8,0))",
});

const overlayNameStyle = css({
  fontFamily: "display",
  fontWeight: "semibold",
  fontSize: { base: "sm", sm: "lg" },
  color: "white",
  textTransform: "capitalize",
  lineHeight: "1.2",
});

const overlaySlugStyle = css({
  fontSize: { base: "2xs", sm: "xs" },
  color: "rgba(255,255,255,0.75)",
});

const handleChipStyle = css({
  position: "absolute",
  top: "2",
  left: "2",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  height: { base: "6", sm: "8" },
  width: { base: "6", sm: "8" },
  borderRadius: "full",
  background: "rgba(255,255,255,0.85)",
  backdropBlur: "glass",
  color: "fg.default",
  cursor: "grab",
});

const featuredChipStyle = css({
  position: "absolute",
  top: "2",
  right: "2",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  height: { base: "6", sm: "8" },
  width: { base: "6", sm: "8" },
  borderRadius: "full",
  background: "rgba(255,255,255,0.85)",
  backdropBlur: "glass",
  cursor: "pointer",
  transition: "transform 0.15s ease",
  "&:hover": { transform: "scale(1.08)" },
});

const uploadOverlayStyle = css({
  position: "absolute",
  inset: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "rgba(20,16,8,0.45)",
  opacity: 0,
  transition: "opacity 0.15s ease",
  color: "white",
  cursor: "pointer",
  "&:hover, &[data-active=true]": { opacity: 1 },
});

const bodyStyle = css({
  display: "flex",
  flexDirection: "column",
  gap: { base: "1", sm: "2" },
  padding: { base: "2", sm: "3.5" },
});

const descriptionStyle = css({
  fontSize: { base: "2xs", sm: "sm" },
  color: "fg.muted",
  lineClamp: 2,
});

const metaRowStyle = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "2",
});

const actionsRowStyle = css({
  display: "flex",
  justifyContent: "flex-end",
  gap: "1",
});

const productsBadgeButtonStyle = css({
  cursor: "pointer",
  transition: "opacity 0.15s ease",
  "&:hover": { opacity: 0.75 },
});

export function CategoryCards({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [items, setItems] = useState(categories);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null);
  const [viewingCategory, setViewingCategory] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ name: "", slug: "", description: "" });
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => setItems(categories), [categories]);

  const persistOrder = async (ordered: Category[]) => {
    const changed = ordered.filter((c, i) => c.featuredOrder !== i);
    if (changed.length === 0) return;
    try {
      await Promise.all(
        changed.map((c) =>
          fetch(`/api/admin/categories/${c.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ featuredOrder: ordered.indexOf(c) }),
          }),
        ),
      );
      router.refresh();
    } catch {
      toast.error("Failed to save new order");
    }
  };

  const handleDragStart = (index: number) => setDraggedIndex(index);

  const handleDragOver = (e: React.DragEvent, index: number) => {
    if (e.dataTransfer.types.includes("Files")) return;
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const reordered = [...items];
    const [dragged] = reordered.splice(draggedIndex, 1);
    reordered.splice(index, 0, dragged);
    setItems(reordered);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    persistOrder(items);
  };

  const toggleFeatured = async (category: Category) => {
    setItems((prev) =>
      prev.map((c) => (c.id === category.id ? { ...c, isFeatured: !c.isFeatured } : c)),
    );
    try {
      const res = await fetch(`/api/admin/categories/${category.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFeatured: !category.isFeatured }),
      });
      if (!res.ok) throw new Error("Failed");
      router.refresh();
    } catch {
      setItems((prev) =>
        prev.map((c) => (c.id === category.id ? { ...c, isFeatured: category.isFeatured } : c)),
      );
      toast.error("Failed to update category");
    }
  };

  const uploadImage = async (category: Category, file: File) => {
    setUploadingId(category.id);
    try {
      const uploadForm = new FormData();
      uploadForm.append("file", file);
      uploadForm.append("categoryName", category.name);
      // Files the image under this category's own folder in the media library.
      if (category.slug) uploadForm.append("categorySlug", category.slug);

      const uploadRes = await fetch("/api/admin/categories/upload", {
        method: "POST",
        body: uploadForm,
      });
      const uploadResult = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadResult.error || "Upload failed");

      const patchRes = await fetch(`/api/admin/categories/${category.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: uploadResult.url }),
      });
      if (!patchRes.ok) throw new Error("Failed to save image");

      toast.success("Category image updated");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to upload image");
    } finally {
      setUploadingId(null);
    }
  };

  const handleImageDrop = (e: React.DragEvent, category: Category) => {
    e.preventDefault();
    e.stopPropagation();
    const file = Array.from(e.dataTransfer.files).find((f) => f.type.startsWith("image/"));
    if (file) uploadImage(category, file);
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      slug: category.slug,
      description: category.description || "",
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
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to delete");
      }

      toast.success("Category deleted successfully");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete category",
      );
    } finally {
      setDeleting(false);
      setDeletingCategoryId(null);
    }
  };

  if (items.length === 0) {
    return (
      <div
        className={css({
          textAlign: "center",
          paddingBlock: "16",
          color: "fg.muted",
          border: "1px dashed",
          borderColor: "border.subtle",
          borderRadius: "xl",
        })}
      >
        No categories yet
      </div>
    );
  }

  const firstFeaturedId = items.find((c) => c.isFeatured)?.id;

  return (
    <>
      <div className={gridStyle}>
        {items.map((category, index) => (
          <div key={category.id} className={cardWrapperStyle}>
            {category.id === firstFeaturedId && (
              <div className={primaryBadgeStyle} title="Primary category">
                <Crown className={css({ height: "3", width: "3" })} fill="currentColor" />
              </div>
            )}
            <div
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={cx(cardStyle, draggedIndex === index && cardDraggingStyle)}
            >
            <div
              className={imageBoxStyle}
              onDragOver={(e) => {
                if (e.dataTransfer.types.includes("Files")) e.preventDefault();
              }}
              onDrop={(e) => handleImageDrop(e, category)}
            >
              {category.image ? (
                <img src={category.image} alt="" className={imageStyle} />
              ) : (
                <div className={emptyImageStyle}>
                  <Upload className={css({ height: { base: "4", sm: "6" }, width: { base: "4", sm: "6" } })} />
                  <span className={css({ fontSize: { base: "2xs", sm: "xs" }, fontWeight: "medium" })}>
                    Add image
                  </span>
                </div>
              )}

              <button
                type="button"
                data-active={uploadingId === category.id}
                className={uploadOverlayStyle}
                onClick={() => fileInputRefs.current[category.id]?.click()}
                aria-label="Change category image"
                title="Click or drop an image to change it"
              >
                {uploadingId === category.id ? (
                  <Loader2 className={css({ height: "5", width: "5", animation: "spin" })} />
                ) : (
                  <Upload className={css({ height: "5", width: "5" })} />
                )}
              </button>
              <input
                ref={(el) => {
                  fileInputRefs.current[category.id] = el;
                }}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadImage(category, file);
                  e.target.value = "";
                }}
                className={css({ srOnly: true })}
              />

              <div className={handleChipStyle} title="Drag to reorder">
                <GripVertical className={css({ height: { base: "3", sm: "4" }, width: { base: "3", sm: "4" } })} />
              </div>

              <button
                type="button"
                className={featuredChipStyle}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFeatured(category);
                }}
                aria-label={category.isFeatured ? "Remove from Explore section" : "Show in Explore section"}
                title={category.isFeatured ? "Featured — click to hide" : "Not featured — click to show"}
              >
                <Star
                  className={css({
                    height: { base: "3", sm: "4" },
                    width: { base: "3", sm: "4" },
                    color: category.isFeatured ? "gold.500" : "fg.muted",
                    fill: category.isFeatured ? "token(colors.gold.500)" : "none",
                  })}
                />
              </button>

              <div className={overlayStyle}>
                <p className={overlayNameStyle}>{category.name}</p>
                <p className={overlaySlugStyle}>/{category.slug}</p>
              </div>
            </div>

            <div className={bodyStyle}>
              {category.description && (
                <p className={descriptionStyle}>{category.description}</p>
              )}
              <div className={metaRowStyle}>
                <button
                  type="button"
                  className={productsBadgeButtonStyle}
                  onClick={(e) => {
                    e.stopPropagation();
                    setViewingCategory(category);
                  }}
                  aria-label={`View ${category._count.products} products in ${category.name}`}
                >
                  <Badge variant="outline">{category._count.products} products</Badge>
                </button>
              </div>
              <div className={actionsRowStyle}>
                <Button variant="ghost" size="icon" onClick={() => handleEdit(category)}>
                  <Pencil className={css({ height: "4", width: "4" })} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDeletingCategoryId(category.id)}
                >
                  <Trash2 className={css({ height: "4", width: "4", color: "danger" })} />
                </Button>
              </div>
            </div>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!editingCategory} onOpenChange={() => setEditingCategory(null)}>
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
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className={css({ display: "flex", flexDirection: "column", gap: "2" })}>
              <Label htmlFor="edit-slug">Slug *</Label>
              <Input
                id="edit-slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                required
              />
            </div>
            <div className={css({ display: "flex", flexDirection: "column", gap: "2" })}>
              <Label htmlFor="edit-description">Description</Label>
              <Input
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <p className={css({ fontSize: "xs", color: "fg.muted" })}>
              Image, featured visibility, and display order are set directly on the card.
            </p>
            <div className={css({ display: "flex", justifyContent: "flex-end", gap: "2" })}>
              <Button type="button" variant="outline" onClick={() => setEditingCategory(null)}>
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
              This action cannot be undone. Categories that still contain products cannot be deleted — move or delete those products first.
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

      <CategoryProductsDialog
        category={viewingCategory}
        onOpenChange={(open) => !open && setViewingCategory(null)}
      />
    </>
  );
}
