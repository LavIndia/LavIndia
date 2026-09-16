"use client";

import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { css } from "styled-system/css";

export function CategoriesHeader() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error("Failed to create");

      toast.success("Category created successfully");
      setOpen(false);
      setFormData({ name: "", slug: "", description: "" });
      router.refresh();
    } catch {
      toast.error("Failed to create category");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div
        className={css({
          display: "flex",
          flexDirection: "column",
          gap: "4",
          md: {
            flexDirection: "row",
            alignItems: "flex-end",
            justifyContent: "space-between",
          },
        })}
      >
        <div>
          <h1
            className={css({
              fontFamily: "display",
              fontSize: "3xl",
              fontWeight: "bold",
              letterSpacing: "tight",
              color: "fg.default",
            })}
          >
            Categories
          </h1>
          <p className={css({ color: "fg.muted", marginTop: "2" })}>
            Manage product categories
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className={css({ height: "4", width: "4", marginRight: "2" })} />
          Add Category
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Category</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleSubmit}
            className={css({ display: "flex", flexDirection: "column", gap: "4" })}
          >
            <div className={css({ display: "flex", flexDirection: "column", gap: "2" })}>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => {
                  setFormData({
                    ...formData,
                    name: e.target.value,
                    slug: e.target.value.toLowerCase().replace(/\s+/g, "-"),
                  });
                }}
                required
              />
            </div>
            <div className={css({ display: "flex", flexDirection: "column", gap: "2" })}>
              <Label htmlFor="slug">Slug *</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) =>
                  setFormData({ ...formData, slug: e.target.value })
                }
                required
              />
            </div>
            <div className={css({ display: "flex", flexDirection: "column", gap: "2" })}>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>
            <div className={css({ display: "flex", justifyContent: "flex-end", gap: "2" })}>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                Create
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
