"use client";

import { useEffect, useMemo, useState } from "react";
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
import {
  Loader2,
  Plus,
  Trash2,
  Wand2,
  CheckCircle2,
  Circle,
  X,
} from "lucide-react";
import { ImageUpload } from "@/components/admin/products/ImageUpload";
import { css, cx } from "styled-system/css";

const requiredMarkStyle = css({ color: "danger", marginLeft: "0.5" });
const fieldStyle = css({ display: "flex", flexDirection: "column", gap: "2" });
const fieldGrid3Style = css({
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: "4",
  sm: { gridTemplateColumns: "repeat(3, 1fr)" },
});

const layoutStyle = css({
  display: "grid",
  gridTemplateColumns: { base: "1fr", lg: "1fr 21rem" },
  gap: "6",
  alignItems: "start",
});

const mainColumnStyle = css({ display: "flex", flexDirection: "column", gap: "6" });
const sidebarColumnStyle = css({
  display: "flex",
  flexDirection: "column",
  gap: "4",
  lg: { position: "sticky", top: "6" },
});

const checklistItemStyle = css({ display: "flex", alignItems: "center", gap: "2", fontSize: "sm" });
const checklistDoneStyle = css({ color: "fg.default" });
const checklistPendingStyle = css({ color: "fg.muted" });

const optionRowStyle = css({ display: "flex", flexDirection: "column", gap: "2" });
const optionInputRowStyle = css({ display: "flex", gap: "2" });
const chipsWrapStyle = css({ display: "flex", flexWrap: "wrap", gap: "1.5" });
const chipStyle = css({
  display: "inline-flex",
  alignItems: "center",
  gap: "1",
  background: "gold.50",
  color: "gold.700",
  border: "1px solid",
  borderColor: "gold.200",
  borderRadius: "full",
  paddingInline: "2.5",
  paddingBlock: "1",
  fontSize: "xs",
  fontWeight: "medium",
});
const chipRemoveStyle = css({
  cursor: "pointer",
  display: "inline-flex",
  "&:hover": { color: "danger" },
});

const curatedPillStyle = css({
  display: "inline-flex",
  alignItems: "center",
  gap: "1.5",
  background: "bg.surface",
  color: "fg.muted",
  border: "1px solid",
  borderColor: "border.subtle",
  borderRadius: "full",
  paddingInline: "2.5",
  paddingBlock: "1",
  fontSize: "xs",
  fontWeight: "medium",
  cursor: "pointer",
  transition: "background 0.15s ease, border-color 0.15s ease, color 0.15s ease",
  "&:hover": { borderColor: "accent.default" },
});
const curatedPillActiveStyle = css({
  background: "gold.50",
  color: "gold.700",
  borderColor: "gold.300",
});
const colorSwatchStyle = css({
  display: "inline-block",
  height: "2.5",
  width: "2.5",
  borderRadius: "full",
  border: "1px solid",
  borderColor: "border.subtle",
});

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
  material: string | null;
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

type OptionDimension = "color" | "size" | "material";
const OPTION_DIMENSIONS: { key: OptionDimension; label: string; placeholder: string }[] = [
  { key: "color", label: "Color", placeholder: "e.g. Gold" },
  { key: "size", label: "Size", placeholder: "e.g. Small" },
  { key: "material", label: "Material", placeholder: "e.g. Sterling Silver" },
];

type CuratedValue = { label: string; value: string; color: string | null };

function OptionChipInput({
  label,
  placeholder,
  values,
  curatedValues,
  onAdd,
  onRemove,
}: {
  label: string;
  placeholder: string;
  values: string[];
  curatedValues?: CuratedValue[];
  onAdd: (value: string) => void;
  onRemove: (value: string) => void;
}) {
  const [draft, setDraft] = useState("");

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed) onAdd(trimmed);
    setDraft("");
  };

  return (
    <div className={optionRowStyle}>
      <Label>{label}</Label>

      {curatedValues && curatedValues.length > 0 && (
        <div className={chipsWrapStyle}>
          {curatedValues.map((curated) => {
            const active = values.some(
              (v) => v.toLowerCase() === curated.label.toLowerCase(),
            );
            return (
              <button
                key={curated.value}
                type="button"
                onClick={() => (active ? onRemove(curated.label) : onAdd(curated.label))}
                className={cx(
                  curatedPillStyle,
                  active && curatedPillActiveStyle,
                )}
              >
                {curated.color && (
                  <span
                    className={colorSwatchStyle}
                    style={{ background: curated.color }}
                  />
                )}
                {curated.label}
              </button>
            );
          })}
        </div>
      )}

      <div className={optionInputRowStyle}>
        <Input
          placeholder={placeholder}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              commit();
            }
          }}
        />
        <Button type="button" variant="outline" onClick={commit}>
          Add custom
        </Button>
      </div>
      {values.length > 0 && (
        <div className={chipsWrapStyle}>
          {values.map((value) => (
            <span key={value} className={chipStyle}>
              {value}
              <X
                className={cx(chipRemoveStyle, css({ height: "3", width: "3" }))}
                onClick={() => onRemove(value)}
              />
            </span>
          ))}
        </div>
      )}
    </div>
  );
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
  const [optionValues, setOptionValues] = useState<Record<OptionDimension, string[]>>({
    color: [],
    size: [],
    material: [],
  });
  const [curatedOptions, setCuratedOptions] = useState<Record<OptionDimension, CuratedValue[]>>({
    color: [],
    size: [],
    material: [],
  });

  useEffect(() => {
    fetch("/api/admin/filters/option-values")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setCuratedOptions(data);
      })
      .catch(() => {
        // Curated list is a convenience — free-text entry still works if this fails.
      });
  }, []);

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

  const addOptionValue = (dim: OptionDimension, value: string) => {
    setOptionValues((prev) =>
      prev[dim].some((v) => v.toLowerCase() === value.toLowerCase())
        ? prev
        : { ...prev, [dim]: [...prev[dim], value] },
    );
  };

  const removeOptionValue = (dim: OptionDimension, value: string) => {
    setOptionValues((prev) => ({
      ...prev,
      [dim]: prev[dim].filter((v) => v !== value),
    }));
  };

  const generateVariants = () => {
    const activeDims = OPTION_DIMENSIONS.map((d) => d.key).filter(
      (dim) => optionValues[dim].length > 0,
    );

    if (activeDims.length === 0) {
      toast.info("Add at least one Color, Size, or Material value first");
      return;
    }

    let combos: Partial<Record<OptionDimension, string>>[] = [{}];
    for (const dim of activeDims) {
      const next: Partial<Record<OptionDimension, string>>[] = [];
      for (const combo of combos) {
        for (const value of optionValues[dim]) {
          next.push({ ...combo, [dim]: value });
        }
      }
      combos = next;
    }

    const existingKeys = new Set(
      variants.map((v) => `${v.color ?? ""}|${v.size ?? ""}|${v.material ?? ""}`),
    );

    const newRows: ProductVariant[] = combos
      .map((c) => ({
        color: c.color ?? null,
        size: c.size ?? null,
        material: c.material ?? null,
      }))
      .filter(
        (c) => !existingKeys.has(`${c.color ?? ""}|${c.size ?? ""}|${c.material ?? ""}`),
      )
      .map((c) => ({
        name: [c.color, c.size, c.material].filter(Boolean).join(" / "),
        color: c.color,
        size: c.size,
        material: c.material,
        priceCents: null,
        stock: 0,
      }));

    if (newRows.length === 0) {
      toast.info("All those combinations are already added");
      return;
    }

    setVariants([...variants, ...newRows]);
    toast.success(
      `${newRows.length} variant${newRows.length > 1 ? "s" : ""} generated`,
    );
  };

  const addBlankVariant = () => {
    setVariants([
      ...variants,
      { name: "", color: null, size: null, material: null, priceCents: null, stock: 0 },
    ]);
  };

  const removeVariant = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  const updateVariant = (
    index: number,
    field: keyof ProductVariant,
    value: string | number,
  ) => {
    setVariants(
      variants.map((v, i) => (i === index ? { ...v, [field]: value } : v)),
    );
  };

  const checklist = useMemo(
    () => [
      { label: "Product name", done: formData.name.trim().length > 0 },
      { label: "Category selected", done: !!formData.categoryId },
      {
        label: "Price set",
        done: !!formData.price && parseFloat(formData.price) > 0,
      },
      { label: "At least one image", done: images.length > 0 },
    ],
    [formData.name, formData.categoryId, formData.price, images.length],
  );
  const readyToPublish = checklist.every((c) => c.done);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
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
        images: images.map((img, i) => ({
          id: img.id,
          url: img.url,
          alt: img.alt,
          isPrimary: img.isPrimary,
          position: i,
        })),
        variants: variants
          .filter((v) => v.name)
          .map((v) => ({
            id: v.id,
            name: v.name,
            color: v.color,
            size: v.size,
            material: v.material,
            priceCents: v.priceCents,
            stock: v.stock,
          })),
      };

      // A single request carrying the whole product (images + variants
      // included) instead of create-then-N-sequential-saves — this is what
      // makes saving fast regardless of how many images/variants there are.
      const res = await fetch(
        product ? `/api/admin/products/${product.id}` : "/api/admin/products",
        {
          method: product ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "Request failed");
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

  return (
    <form onSubmit={handleSubmit} className={layoutStyle}>
      <div className={mainColumnStyle}>
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Essential product details</CardDescription>
          </CardHeader>
          <CardContent className={css({ display: "flex", flexDirection: "column", gap: "4" })}>
            <div className={fieldStyle}>
              <Label htmlFor="name">
                Product Name<span className={requiredMarkStyle}>*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                required
              />
            </div>

            <div className={fieldStyle}>
              <Label htmlFor="slug">
                Slug<span className={requiredMarkStyle}>*</span>
              </Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => handleChange("slug", e.target.value)}
                required
              />
            </div>

            <div className={fieldStyle}>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleChange("description", e.target.value)}
                rows={4}
              />
            </div>

            <div className={fieldStyle}>
              <Label htmlFor="sku">SKU</Label>
              <Input
                id="sku"
                value={formData.sku}
                onChange={(e) => handleChange("sku", e.target.value)}
                placeholder="PROD-001"
              />
            </div>
          </CardContent>
        </Card>

        {/* Pricing & Inventory */}
        <Card>
          <CardHeader>
            <CardTitle>Pricing & Inventory</CardTitle>
            <CardDescription>Set the price customers pay and how much stock is available</CardDescription>
          </CardHeader>
          <CardContent className={css({ display: "flex", flexDirection: "column", gap: "4" })}>
            <div className={fieldGrid3Style}>
              <div className={fieldStyle}>
                <Label htmlFor="price">
                  Price (₹)<span className={requiredMarkStyle}>*</span>
                </Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => handleChange("price", e.target.value)}
                  required
                />
              </div>

              <div className={fieldStyle}>
                <Label htmlFor="compareAtPrice">Compare At Price (₹)</Label>
                <Input
                  id="compareAtPrice"
                  type="number"
                  step="0.01"
                  value={formData.compareAtPrice}
                  onChange={(e) => handleChange("compareAtPrice", e.target.value)}
                />
              </div>

              <div className={fieldStyle}>
                <Label htmlFor="stock">
                  Stock<span className={requiredMarkStyle}>*</span>
                </Label>
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

        {/* Options & Variants */}
        <Card>
          <CardHeader>
            <CardTitle>Options & Variants</CardTitle>
            <CardDescription>
              Add the Color, Size, or Material values this product comes in,
              then generate every combination as a variant instead of typing
              each one by hand.
            </CardDescription>
          </CardHeader>
          <CardContent className={css({ display: "flex", flexDirection: "column", gap: "5" })}>
            <div className={fieldGrid3Style}>
              {OPTION_DIMENSIONS.map((dim) => (
                <OptionChipInput
                  key={dim.key}
                  label={dim.label}
                  placeholder={dim.placeholder}
                  values={optionValues[dim.key]}
                  curatedValues={curatedOptions[dim.key]}
                  onAdd={(value) => addOptionValue(dim.key, value)}
                  onRemove={(value) => removeOptionValue(dim.key, value)}
                />
              ))}
            </div>

            <Button type="button" variant="outline" onClick={generateVariants}>
              <Wand2 className={css({ height: "4", width: "4" })} />
              Generate Variants
            </Button>

            {variants.length > 0 && (
              <div className={css({ display: "flex", flexDirection: "column", gap: "3" })}>
                {variants.map((variant, index) => (
                  <div
                    key={index}
                    className={css({
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "2",
                      borderTop: "1px solid",
                      borderColor: "border.subtle",
                      paddingTop: "3",
                    })}
                  >
                    <div
                      className={css({
                        flex: "1",
                        display: "grid",
                        gridTemplateColumns: "1fr",
                        gap: "2",
                        sm: { gridTemplateColumns: "2fr 1fr 1fr 1fr" },
                      })}
                    >
                      <Input
                        placeholder="Variant name"
                        value={variant.name}
                        onChange={(e) => updateVariant(index, "name", e.target.value)}
                      />
                      <Input
                        type="number"
                        placeholder="Price override"
                        value={variant.priceCents ? variant.priceCents / 100 : ""}
                        onChange={(e) =>
                          updateVariant(
                            index,
                            "priceCents",
                            e.target.value ? parseFloat(e.target.value) * 100 : 0,
                          )
                        }
                      />
                      <Input
                        type="number"
                        placeholder="Stock"
                        value={variant.stock}
                        onChange={(e) =>
                          updateVariant(index, "stock", parseInt(e.target.value) || 0)
                        }
                      />
                      <p
                        className={css({
                          fontSize: "xs",
                          color: "fg.muted",
                          alignSelf: "center",
                        })}
                      >
                        {[variant.color, variant.size, variant.material]
                          .filter(Boolean)
                          .join(" · ") || "Custom variant"}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Remove variant"
                      onClick={() => removeVariant(index)}
                    >
                      <Trash2 className={css({ height: "4", width: "4", color: "danger" })} />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={addBlankVariant}
              className={css({ alignSelf: "flex-start" })}
            >
              <Plus className={css({ height: "3.5", width: "3.5" })} />
              Add a one-off variant
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Sidebar */}
      <div className={sidebarColumnStyle}>
        <Card>
          <CardContent className={css({ display: "flex", flexDirection: "column", gap: "3", paddingTop: "6" })}>
            <Button type="submit" disabled={loading} className={css({ width: "full" })}>
              {loading && <Loader2 className={css({ height: "4", width: "4", animation: "spin" })} />}
              {product ? "Save Changes" : "Create Product"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/admin/products")}
              className={css({ width: "full" })}
            >
              Cancel
            </Button>

            <div
              className={css({
                display: "flex",
                flexDirection: "column",
                gap: "1.5",
                marginTop: "2",
                paddingTop: "4",
                borderTop: "1px solid",
                borderColor: "border.subtle",
              })}
            >
              <p className={css({ fontSize: "xs", fontWeight: "medium", color: "fg.muted", textTransform: "uppercase", letterSpacing: "wide", marginBottom: "1" })}>
                {readyToPublish ? "Ready to publish" : "Before you publish"}
              </p>
              {checklist.map((item) => (
                <div
                  key={item.label}
                  className={cx(
                    checklistItemStyle,
                    item.done ? checklistDoneStyle : checklistPendingStyle,
                  )}
                >
                  {item.done ? (
                    <CheckCircle2 className={css({ height: "4", width: "4", color: "success", flexShrink: 0 })} />
                  ) : (
                    <Circle className={css({ height: "4", width: "4", flexShrink: 0 })} />
                  )}
                  {item.label}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className={css({ fontSize: "md" })}>Status</CardTitle>
          </CardHeader>
          <CardContent className={css({ display: "flex", flexDirection: "column", gap: "4" })}>
            <div className={css({ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "4" })}>
              <div className={css({ display: "flex", flexDirection: "column", gap: "0.5" })}>
                <Label htmlFor="published">Published</Label>
                <p className={css({ fontSize: "xs", color: "fg.muted" })}>
                  Visible on the storefront
                </p>
              </div>
              <Switch
                id="published"
                checked={formData.isPublished}
                onCheckedChange={(checked) => handleChange("isPublished", checked)}
              />
            </div>

            <div className={css({ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "4" })}>
              <div className={css({ display: "flex", flexDirection: "column", gap: "0.5" })}>
                <Label htmlFor="featured">Featured</Label>
                <p className={css({ fontSize: "xs", color: "fg.muted" })}>
                  Shown in featured sections
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

        <Card>
          <CardHeader>
            <CardTitle className={css({ fontSize: "md" })}>Organization</CardTitle>
          </CardHeader>
          <CardContent className={css({ display: "flex", flexDirection: "column", gap: "4" })}>
            <div className={fieldStyle}>
              <Label htmlFor="category">
                Category<span className={requiredMarkStyle}>*</span>
              </Label>
              <Select
                value={formData.categoryId}
                onValueChange={(value) => handleChange("categoryId", value)}
                required
              >
                <SelectTrigger id="category">
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
          </CardContent>
        </Card>
      </div>
    </form>
  );
}
