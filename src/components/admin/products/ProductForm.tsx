"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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
  Upload,
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
const fieldGrid2Style = css({
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: "4",
  sm: { gridTemplateColumns: "repeat(2, 1fr)" },
});

const layoutStyle = css({
  display: "grid",
  gridTemplateColumns: { base: "1fr", lg: "1fr 21rem" },
  gap: "6",
  alignItems: "start",
});

const actionBarStyle = css({
  position: "sticky",
  top: "0",
  zIndex: "40",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "4",
  flexWrap: "wrap",
  marginBottom: "6",
  paddingBlock: "3",
  paddingInline: "4",
  borderRadius: "xl",
  border: "1px solid",
  borderColor: "border.glass",
  background: "bg.glassStrong",
  backdropBlur: "glass",
  boxShadow: "glassLg",
});

const actionBarButtonsStyle = css({ display: "flex", alignItems: "center", gap: "2" });

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

const variantGalleryStyle = css({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: "2",
});
const variantThumbWrapStyle = css({
  position: "relative",
  height: "14",
  width: "14",
  flexShrink: 0,
  "&:hover .variant-thumb-remove": { opacity: 1 },
});
const variantThumbRemoveStyle = css({
  position: "absolute",
  top: "-1.5",
  right: "-1.5",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  height: "4.5",
  width: "4.5",
  borderRadius: "full",
  background: "danger",
  color: "white",
  opacity: 0,
  transition: "opacity 0.15s ease",
  cursor: "pointer",
  boxShadow: "sm",
});
const variantImageThumbStyle = css({
  height: "full",
  width: "full",
  objectFit: "cover",
  borderRadius: "lg",
  border: "1px solid",
  borderColor: "border.subtle",
  boxShadow: "sm",
});
const variantImageAddButtonStyle = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  height: "14",
  width: "14",
  flexShrink: 0,
  borderRadius: "lg",
  border: "1px dashed",
  borderColor: "border.subtle",
  background: "bg.surface",
  color: "fg.muted",
  cursor: "pointer",
  "&:hover": { borderColor: "accent.default", color: "fg.default" },
  "&:disabled": { opacity: 0.6, cursor: "not-allowed" },
});
const variantImageMenuStyle = css({
  position: "absolute",
  zIndex: "50",
  marginTop: "1.5",
  display: "flex",
  flexDirection: "column",
  gap: "2",
  padding: "2",
  minWidth: "48",
  maxHeight: "64",
  overflowY: "auto",
  borderRadius: "lg",
  border: "1px solid",
  borderColor: "border.glass",
  background: "bg.glassStrong",
  backdropBlur: "glass",
  boxShadow: "glassLg",
});
const variantImageMenuUploadStyle = css({
  display: "flex",
  alignItems: "center",
  gap: "2",
  borderRadius: "md",
  border: "1px dashed",
  borderColor: "border.subtle",
  paddingInline: "3",
  paddingBlock: "2",
  fontSize: "sm",
  fontWeight: "medium",
  color: "fg.default",
  cursor: "pointer",
  "&:hover": { borderColor: "accent.default" },
});
const variantImageMenuGridStyle = css({
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: "1.5",
});
const variantImageMenuItemStyle = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  height: "10",
  width: "10",
  borderRadius: "md",
  border: "1px solid",
  borderColor: "border.subtle",
  overflow: "hidden",
  cursor: "pointer",
  "&:hover": { borderColor: "accent.default" },
});

interface ProductImage {
  id?: string;
  url: string;
  alt: string | null;
  isPrimary: boolean;
  position: number;
  // Client-only grouping key: the owning variant's `clientId`, or null for
  // the product's general gallery. Resolved to a real variantId (or a
  // variantClientId for a not-yet-created variant) when the form saves.
  variantKey: string | null;
}

interface ProductVariant {
  id?: string;
  // Client-only stable key so a variant's images can be grouped/attached
  // before the variant itself has a database id (e.g. a brand-new variant
  // that hasn't been saved yet).
  clientId: string;
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
  isLimitedEdition: boolean;
  images: (Omit<ProductImage, "variantKey"> & { variantId: string | null })[];
  variants: Omit<ProductVariant, "clientId">[];
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

// Lets an admin build a small gallery for one variant (e.g. every angle of
// the Gold color variant): pick from images not yet claimed by another
// variant, or upload a new one directly. A Size-only variant typically
// needs none of this — the base product photos already cover it.
function VariantGallery({
  variantKey,
  images,
  productName,
  categoryId,
  onAssign,
  onUnassign,
  onUploaded,
}: {
  variantKey: string;
  images: ProductImage[];
  productName: string;
  // Decides the media-library folder these uploads are filed under, so
  // ImageKit mirrors the catalog rather than collecting loose files.
  categoryId: string;
  onAssign: (image: ProductImage) => void;
  onUnassign: (image: ProductImage) => void;
  onUploaded: (image: ProductImage) => void;
}) {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ownImages = images.filter((img) => img.variantKey === variantKey);
  const unassignedImages = images.filter((img) => img.variantKey === null);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [open]);

  const handleUpload = async (files: File[]) => {
    if (files.length === 0) return;
    setUploading(true);
    try {
      const uploaded = await Promise.all(
        files.map(async (file) => {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("productName", productName || "");
          formData.append("categoryId", categoryId || "");

          const res = await fetch("/api/admin/products/upload", {
            method: "POST",
            body: formData,
          });
          const result = await res.json();
          if (!res.ok) throw new Error(result.error || `Failed to upload ${file.name}`);
          return { url: result.url as string, alt: file.name };
        }),
      );

      uploaded.forEach((img, i) =>
        onUploaded({
          url: img.url,
          alt: img.alt,
          isPrimary: false,
          position: ownImages.length + i,
          variantKey,
        }),
      );
      toast.success(
        uploaded.length > 1 ? `${uploaded.length} images uploaded` : "Image uploaded",
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to upload image",
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={variantGalleryStyle} onClick={(e) => e.stopPropagation()}>
      {ownImages.map((img) => (
        <div key={img.id ?? img.url} className={variantThumbWrapStyle}>
          <img src={img.url} alt="" className={variantImageThumbStyle} />
          <button
            type="button"
            className={cx("variant-thumb-remove", variantThumbRemoveStyle)}
            onClick={() => onUnassign(img)}
            aria-label="Move to Product Images"
            title="Move to Product Images"
          >
            <X className={css({ height: "2.5", width: "2.5" })} />
          </button>
        </div>
      ))}

      <div className={css({ position: "relative" })}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          disabled={uploading}
          className={variantImageAddButtonStyle}
          aria-label="Add variant image"
          title="Add variant image"
        >
          {uploading ? (
            <Loader2 className={css({ height: "4", width: "4", animation: "spin" })} />
          ) : (
            <Plus className={css({ height: "4", width: "4" })} />
          )}
        </button>
        {open && (
          <div className={variantImageMenuStyle}>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={variantImageMenuUploadStyle}
            >
              <Upload className={css({ height: "3.5", width: "3.5" })} />
              Upload new
            </button>
            {unassignedImages.length > 0 && (
              <div className={variantImageMenuGridStyle}>
                {unassignedImages.map((img) => (
                  <button
                    key={img.id ?? img.url}
                    type="button"
                    onClick={() => {
                      onAssign(img);
                      setOpen(false);
                    }}
                    className={variantImageMenuItemStyle}
                    title="Use this image"
                  >
                    <img src={img.url} alt="" className={variantImageThumbStyle} />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          if (files.length) handleUpload(files);
          if (fileInputRef.current) fileInputRef.current.value = "";
          setOpen(false);
        }}
        className={css({ srOnly: true })}
      />
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
    isLimitedEdition: product?.isLimitedEdition || false,
  });

  const initialVariants = useMemo<ProductVariant[]>(
    () =>
      (product?.variants || []).map((v) => ({
        ...v,
        clientId: crypto.randomUUID(),
      })),
    [product],
  );
  const variantIdToClientId = useMemo(
    () =>
      new Map(
        initialVariants
          .filter((v): v is ProductVariant & { id: string } => !!v.id)
          .map((v) => [v.id, v.clientId]),
      ),
    [initialVariants],
  );

  const [images, setImages] = useState<ProductImage[]>(() =>
    (product?.images || []).map((img) => ({
      ...img,
      variantKey: img.variantId ? variantIdToClientId.get(img.variantId) ?? null : null,
    })),
  );
  const [variants, setVariants] = useState<ProductVariant[]>(initialVariants);
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
        clientId: crypto.randomUUID(),
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
      {
        clientId: crypto.randomUUID(),
        name: "",
        color: null,
        size: null,
        material: null,
        priceCents: null,
        stock: 0,
      },
    ]);
  };

  const removeVariant = (index: number) => {
    const removed = variants[index];
    setVariants(variants.filter((_, i) => i !== index));
    // The variant's own photos aren't deleted — they fall back into the
    // general Product Images gallery instead.
    setImages((prev) =>
      prev.map((img) =>
        img.variantKey === removed.clientId ? { ...img, variantKey: null } : img,
      ),
    );
  };

  const updateVariant = (
    index: number,
    field: keyof ProductVariant,
    value: string | number | null,
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
  const generalImages = images.filter((img) => img.variantKey === null);
  const setGeneralImages = (
    updated: { id?: string; url: string; alt: string | null; isPrimary: boolean; position: number }[],
  ) => {
    setImages([
      ...updated.map((img) => ({ ...img, variantKey: null })),
      ...images.filter((img) => img.variantKey !== null),
    ]);
  };
  const formRef = useRef<HTMLFormElement>(null);
  const [savingAction, setSavingAction] = useState<"draft" | "publish" | null>(null);

  const handleSave = async (publish: boolean) => {
    if (!formRef.current?.reportValidity()) return;

    if (publish) {
      const missing = checklist.filter((c) => !c.done);
      if (missing.length > 0) {
        toast.error(
          `Add ${missing.map((m) => m.label.toLowerCase()).join(", ")} before publishing`,
        );
        return;
      }
    }

    setSavingAction(publish ? "publish" : "draft");
    setLoading(true);

    try {
      const clientIdToVariantId = new Map(
        variants.filter((v): v is ProductVariant & { id: string } => !!v.id)
          .map((v) => [v.clientId, v.id]),
      );

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
        isPublished: publish,
        // Publishing also clears any leftover soft-archive state (set when
        // a product with existing orders was previously deleted) — without
        // this, a re-published product silently stays invisible on the
        // storefront because isActive is a separate gate from isPublished.
        ...(publish ? { isActive: true } : {}),
        isFeatured: formData.isFeatured,
        isLimitedEdition: formData.isLimitedEdition,
        discountPercent: null,
        images: images.map((img, i) => {
          const resolvedVariantId = img.variantKey
            ? clientIdToVariantId.get(img.variantKey) ?? null
            : null;
          return {
            id: img.id,
            url: img.url,
            alt: img.alt,
            isPrimary: img.isPrimary,
            position: i,
            variantId: resolvedVariantId,
            // Only needed when the image belongs to a variant that hasn't
            // been created yet — the server resolves this to a real id.
            variantClientId:
              img.variantKey && !resolvedVariantId ? img.variantKey : undefined,
          };
        }),
        variants: variants
          .filter((v) => v.name)
          .map((v) => ({
            id: v.id,
            clientId: v.clientId,
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

      setFormData((prev) => ({ ...prev, isPublished: publish }));
      toast.success(publish ? "Product published" : "Draft saved");
      router.push("/admin/products");
      router.refresh();
    } catch {
      toast.error(
        publish ? "Failed to publish product" : "Failed to save draft",
      );
    } finally {
      setLoading(false);
      setSavingAction(null);
    }
  };

  return (
    <form
      ref={formRef}
      onSubmit={(e) => e.preventDefault()}
      className={layoutStyle}
    >
      <div className={css({ gridColumn: "1 / -1" })}>
        <div className={actionBarStyle}>
          <div className={css({ display: "flex", alignItems: "center", gap: "3", minWidth: "0" })}>
            <p
              className={css({
                fontWeight: "medium",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              })}
            >
              {formData.name || (product ? "Edit product" : "New product")}
            </p>
            <Badge variant={formData.isPublished ? "default" : "secondary"}>
              {formData.isPublished ? "Published" : "Draft"}
            </Badge>
          </div>
          <div className={actionBarButtonsStyle}>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/admin/products")}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleSave(false)}
              disabled={loading}
            >
              {loading && savingAction === "draft" && (
                <Loader2 className={css({ height: "4", width: "4", animation: "spin" })} />
              )}
              Save Draft
            </Button>
            <Button type="button" onClick={() => handleSave(true)} disabled={loading}>
              {loading && savingAction === "publish" && (
                <Loader2 className={css({ height: "4", width: "4", animation: "spin" })} />
              )}
              {formData.isPublished ? "Save & Publish" : "Publish"}
            </Button>
          </div>
        </div>
      </div>
      <div className={mainColumnStyle}>
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Essential product details</CardDescription>
          </CardHeader>
          <CardContent className={css({ display: "flex", flexDirection: "column", gap: "4" })}>
            <div className={fieldGrid3Style}>
              <div className={css({ display: "flex", flexDirection: "column", gap: "2", sm: { gridColumn: "span 2" } })}>
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
            </div>

            <div className={fieldGrid2Style}>
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
                <Label htmlFor="sku">SKU</Label>
                <Input
                  id="sku"
                  value={formData.sku}
                  onChange={(e) => handleChange("sku", e.target.value)}
                  placeholder="PROD-001"
                />
              </div>
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
                    key={variant.clientId}
                    className={css({
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "2",
                      borderTop: "1px solid",
                      borderColor: "border.subtle",
                      paddingTop: "3",
                    })}
                  >
                    <VariantGallery
                      variantKey={variant.clientId}
                      images={images}
                      productName={formData.name}
                      categoryId={formData.categoryId}
                      onAssign={(image) =>
                        setImages((prev) =>
                          prev.map((img) =>
                            img === image ? { ...img, variantKey: variant.clientId } : img,
                          ),
                        )
                      }
                      onUnassign={(image) =>
                        setImages((prev) =>
                          prev.map((img) =>
                            img === image ? { ...img, variantKey: null } : img,
                          ),
                        )
                      }
                      onUploaded={(image) => setImages((prev) => [...prev, image])}
                    />
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
                        placeholder={
                          formData.price
                            ? `Same as base (₹${formData.price})`
                            : "Same as base price"
                        }
                        value={variant.priceCents ? variant.priceCents / 100 : ""}
                        onChange={(e) =>
                          updateVariant(
                            index,
                            "priceCents",
                            e.target.value ? parseFloat(e.target.value) * 100 : null,
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

        {/* Images */}
        <Card>
          <CardHeader>
            <CardTitle>Product Images</CardTitle>
            <CardDescription>
              The general gallery shown on the product page. Variant-specific
              photos are added directly on each variant above instead.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ImageUpload
              images={generalImages}
              setImages={setGeneralImages}
              productName={formData.name}
              categoryId={formData.categoryId}
            />
          </CardContent>
        </Card>
      </div>

      {/* Sidebar */}
      <div className={sidebarColumnStyle}>
        <Card>
          <CardHeader>
            <CardTitle className={css({ fontSize: "md" })}>
              {readyToPublish ? "Ready to publish" : "Before you publish"}
            </CardTitle>
          </CardHeader>
          <CardContent className={css({ display: "flex", flexDirection: "column", gap: "1.5" })}>
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className={css({ fontSize: "md" })}>Status</CardTitle>
          </CardHeader>
          <CardContent className={css({ display: "flex", flexDirection: "column", gap: "4" })}>
            <div className={css({ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "4" })}>
              <div className={css({ display: "flex", flexDirection: "column", gap: "0.5" })}>
                <Label>Visibility</Label>
                <p className={css({ fontSize: "xs", color: "fg.muted" })}>
                  {formData.isPublished
                    ? "Live on the storefront"
                    : "Use Publish above to make it live"}
                </p>
              </div>
              <Badge variant={formData.isPublished ? "default" : "secondary"}>
                {formData.isPublished ? "Published" : "Draft"}
              </Badge>
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

            <div className={css({ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "4" })}>
              <div className={css({ display: "flex", flexDirection: "column", gap: "0.5" })}>
                <Label htmlFor="limited-edition">Limited Edition</Label>
                <p className={css({ fontSize: "xs", color: "fg.muted" })}>
                  Tags the product card as an exclusive, limited run
                </p>
              </div>
              <Switch
                id="limited-edition"
                checked={formData.isLimitedEdition}
                onCheckedChange={(checked) => handleChange("isLimitedEdition", checked)}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </form>
  );
}
