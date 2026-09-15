"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, GripVertical } from "lucide-react";
import { ImageUpload } from "@/components/admin/products/ImageUpload";

interface ProductImage {
  id?: string;
  url: string;
  alt: string | null;
  isPrimary: boolean;
  position: number;
}

interface ProductVariant {
  id?: string;
  name: string;
  color: string | null;
  size: string | null;
  priceCents: number | null;
  stock: number;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  priceCents: number;
  compareAtCents: number | null;
  discountPercent: number | null;
  stock: number;
  categoryId: string;
  sku: string | null;
  isPublished: boolean;
  isFeatured: boolean;
  images: ProductImage[];
  variants: ProductVariant[];
}

interface ProductFormProps {
  product?: Product;
  categories: Array<{ id: string; name: string }>;
}

export function ProductForm({ product, categories }: ProductFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: product?.name || "",
    slug: product?.slug || "",
    description: product?.description || "",
    price: product ? (product.priceCents / 100).toString() : "",
    compareAtPrice: product?.compareAtCents
      ? (product.compareAtCents / 100).toString()
      : "",
    stock: product?.stock.toString() || "0",
    categoryId: product?.categoryId || "",
    sku: product?.sku || "",
    isPublished: product?.isPublished || false,
    isFeatured: product?.isFeatured || false,
  });

  const [images, setImages] = useState<ProductImage[]>(product?.images || []);
  const [variants, setVariants] = useState<ProductVariant[]>(
    product?.variants || [],
  );

  const handleChange = (field: string, value: string | boolean) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };

      // Auto-generate slug from name
      if (field === "name" && typeof value === "string") {
        updated.slug = value
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "");
      }

      return updated;
    });
  };

  const addVariant = () => {
    setVariants([
      ...variants,
      { name: "", color: null, size: null, priceCents: null, stock: 0 },
    ]);
  };

  const removeVariant = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  const updateVariant = (
    index: number,
    field: string,
    value: string | number,
  ) => {
    setVariants(
      variants.map((v, i) => (i === index ? { ...v, [field]: value } : v)),
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const productData = {
        name: formData.name,
        slug: formData.slug,
        description: formData.description || null,
        priceCents: Math.round(parseFloat(formData.price) * 100),
        compareAtCents: formData.compareAtPrice
          ? Math.round(parseFloat(formData.compareAtPrice) * 100)
          : null,
        stock: parseInt(formData.stock),
        categoryId: formData.categoryId,
        sku: formData.sku || null,
        isPublished: formData.isPublished,
        isFeatured: formData.isFeatured,
        discountPercent: null,
      };

      let productId = product?.id;

      // Create or update product
      if (product) {
        const res = await fetch(`/api/admin/products/${product.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(productData),
        });

        if (!res.ok) throw new Error("Failed to update product");
      } else {
        const res = await fetch("/api/admin/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(productData),
        });

        if (!res.ok) throw new Error("Failed to create product");
        const created = await res.json();
        productId = created.id;
      }

      // Save images
      if (productId) {
        await saveImages(productId);
        await saveVariants(productId);
      }

      toast.success(product ? "Product updated" : "Product created");
      router.push("/admin/products");
      router.refresh();
    } catch {
      toast.error(
        product ? "Failed to update product" : "Failed to create product",
      );
    } finally {
      setLoading(false);
    }
  };

  const saveImages = async (productId: string) => {
    // Delete removed images
    if (product) {
      const existingIds = new Set(
        images.filter((img) => img.id).map((img) => img.id),
      );
      const removedImages = product.images.filter(
        (img) => !existingIds.has(img.id),
      );

      for (const img of removedImages) {
        await fetch(`/api/admin/products/${productId}/images/${img.id}`, {
          method: "DELETE",
        });
      }
    }

    // Update image order and primary status
    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      if (img.id) {
        await fetch(`/api/admin/products/${productId}/images/${img.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            position: i,
            isPrimary: img.isPrimary,
            alt: img.alt,
          }),
        });
      } else {
        await fetch(`/api/admin/products/${productId}/images`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: img.url,
            alt: img.alt,
            isPrimary: img.isPrimary,
            position: i,
          }),
        });
      }
    }
  };

  const saveVariants = async (productId: string) => {
    // For simplicity, delete all variants and recreate
    // In production, you'd want smarter diffing
    if (product) {
      for (const variant of product.variants) {
        await fetch(`/api/admin/products/${productId}/variants/${variant.id}`, {
          method: "DELETE",
        });
      }
    }

    for (const variant of variants) {
      if (variant.name) {
        await fetch(`/api/admin/products/${productId}/variants`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: variant.name,
            color: variant.color || null,
            size: variant.size || null,
            priceCents: variant.priceCents || null,
            stock: variant.stock,
          }),
        });
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>Essential product details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Product Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="slug">Slug *</Label>
            <Input
              id="slug"
              value={formData.slug}
              onChange={(e) => handleChange("slug", e.target.value)}
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="category">Category *</Label>
              <Select
                value={formData.categoryId}
                onValueChange={(value) => handleChange("categoryId", value)}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="sku">SKU</Label>
              <Input
                id="sku"
                value={formData.sku}
                onChange={(e) => handleChange("sku", e.target.value)}
                placeholder="PROD-001"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pricing & Inventory */}
      <Card>
        <CardHeader>
          <CardTitle>Pricing & Inventory</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="price">Price (₹) *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => handleChange("price", e.target.value)}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="compareAtPrice">Compare At Price (₹)</Label>
              <Input
                id="compareAtPrice"
                type="number"
                step="0.01"
                value={formData.compareAtPrice}
                onChange={(e) => handleChange("compareAtPrice", e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="stock">Stock *</Label>
              <Input
                id="stock"
                type="number"
                value={formData.stock}
                onChange={(e) => handleChange("stock", e.target.value)}
                required
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Images */}
      <Card>
        <CardHeader>
          <CardTitle>Product Images</CardTitle>
          <CardDescription>Upload and manage product images</CardDescription>
        </CardHeader>
        <CardContent>
          <ImageUpload
            images={images}
            setImages={setImages}
            productName={formData.name}
          />
        </CardContent>
      </Card>

      {/* Variants */}
      <Card>
        <CardHeader>
          <CardTitle>Variants</CardTitle>
          <CardDescription>Optional product variations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {variants.map((variant, index) => (
            <div key={index} className="flex items-start gap-2 border-b pb-4">
              <GripVertical className="h-5 w-5 text-muted-foreground mt-2" />
              <div className="flex-1 grid grid-cols-5 gap-2">
                <Input
                  placeholder="Variant name"
                  value={variant.name}
                  onChange={(e) => updateVariant(index, "name", e.target.value)}
                />
                <Input
                  placeholder="Color"
                  value={variant.color || ""}
                  onChange={(e) =>
                    updateVariant(index, "color", e.target.value)
                  }
                />
                <Input
                  placeholder="Size"
                  value={variant.size || ""}
                  onChange={(e) => updateVariant(index, "size", e.target.value)}
                />
                <Input
                  type="number"
                  placeholder="Price override"
                  value={variant.priceCents ? variant.priceCents / 100 : ""}
                  onChange={(e) =>
                    updateVariant(
                      index,
                      "priceCents",
                      parseFloat(e.target.value) * 100,
                    )
                  }
                />
                <Input
                  type="number"
                  placeholder="Stock"
                  value={variant.stock}
                  onChange={(e) =>
                    updateVariant(index, "stock", parseInt(e.target.value))
                  }
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeVariant(index)}
              >
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </div>
          ))}

          <Button type="button" variant="outline" onClick={addVariant}>
            <Plus className="h-4 w-4 mr-2" />
            Add Variant
          </Button>
        </CardContent>
      </Card>

      {/* Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="published">Published</Label>
              <p className="text-sm text-muted-foreground">
                Make this product visible on the storefront
              </p>
            </div>
            <Switch
              id="published"
              checked={formData.isPublished}
              onCheckedChange={(checked) =>
                handleChange("isPublished", checked)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="featured">Featured</Label>
              <p className="text-sm text-muted-foreground">
                Show this product in featured sections
              </p>
            </div>
            <Switch
              id="featured"
              checked={formData.isFeatured}
              onCheckedChange={(checked) => handleChange("isFeatured", checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/products")}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {product ? "Update Product" : "Create Product"}
        </Button>
      </div>
    </form>
  );
}
