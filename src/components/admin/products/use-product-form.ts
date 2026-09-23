"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { buildProductPayload } from "@/components/admin/products/product-form-payload";
import { useProductImages } from "@/components/admin/products/use-product-images";
import {
  activeDimensions,
  blankVariant,
  describeDimensionSet,
  dimensionSetOf,
  existingDimensionSets,
  expandVariantsToDimensions,
  generateVariantRows,
  isDimensionUpgrade,
  optionValuesOf,
} from "@/components/admin/products/product-form-variants";
import type {
  CuratedValues,
  FormError,
  OptionDimension,
  Product,
  ProductFormData,
  ProductVariant,
} from "@/components/admin/products/product-form-types";

/**
 * All of the product form's state and behaviour.
 *
 * Held apart from the markup so the form itself is composition — which card
 * goes where — and so the parts with rules in them (the Default variant, the
 * image groups, the save) can be read on their own. The variant
 * combinatorics live in product-form-variants.ts.
 */
export function useProductForm(product?: Product) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<FormError | null>(null);

  const [formData, setFormData] = useState<ProductFormData>({
    name: product?.name || "",
    slug: product?.slug || "",
    description: product?.description || "",
    price: product ? (product.priceCents / 100).toString() : "",
    compareAtPrice: product?.compareAtCents
      ? (product.compareAtCents / 100).toString()
      : "",
    costPrice:
      product?.costCents === null || product?.costCents === undefined
        ? ""
        : (product.costCents / 100).toString(),
    // Deprecated column, carried through unchanged so the save payload stays
    // valid. Real stock lives in Inventory and is never edited here.
    stock: product?.stock.toString() || "0",
    categoryId: product?.categoryId || "",
    sku: product?.sku || "",
    material: product?.material || "",
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

  const { images, imagesInGroup, setImagesInGroup, moveImage } = useProductImages(product?.images);
  const [variants, setVariants] = useState<ProductVariant[]>(initialVariants);
  const [optionValues, setOptionValues] = useState<Record<OptionDimension, string[]>>(() =>
    optionValuesOf(initialVariants),
  );
  // Keyed by attribute rather than by variant dimension, because the curated
  // material list feeds the product's own Material field.
  const [curatedOptions, setCuratedOptions] = useState<CuratedValues>({
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

  /**
   * Adds real variants. A product sold as a single item carries an implicit
   * "Default" variant; the moment it gains a real one, the Default no longer
   * describes anything and is dropped — the server recreates it if the
   * product is ever left with no variants again.
   */
  const appendVariants = (rows: ProductVariant[]) => {
    const implicit = variants.find((v) => v.isDefault);
    const rest = variants.filter((v) => !v.isDefault);
    if (!implicit || rows.length === 0) {
      setVariants([...rest, ...rows]);
      return;
    }

    // The implicit Default is not deleted and replaced — it becomes the first
    // real combination, keeping its id and therefore its SKU, its barcode and
    // the stock already received against it. Replacing it would throw away
    // units that are physically on a shelf, which the server rightly refuses.
    const [first, ...others] = rows;
    const promoted: ProductVariant = {
      ...first,
      id: implicit.id,
      clientId: implicit.clientId,
      sku: implicit.sku,
      barcode: implicit.barcode,
      isDefault: false,
    };
    setVariants([...rest, promoted, ...others]);
  };

  const generateVariants = () => {
    if (activeDimensions(optionValues).length === 0) {
      setError({
        title: "Nothing to generate yet",
        message: "Add at least one Colour, Size, or Material value first, then generate.",
      });
      return;
    }

    const newRows = generateVariantRows(optionValues, variants);
    if (newRows.length === 0) {
      toast.info("All those combinations are already added");
      return;
    }

    // Every variant of a product has to be described by the same options.
    // Mixing Colour-only variants with Colour-and-Size ones is what makes a
    // product unreadable in the shop, so it is refused rather than created
    // and then wondered about.
    const existing = existingDimensionSets(variants);
    const incoming = dimensionSetOf(newRows[0]);
    const clashing = existing.filter((set) => set !== incoming);
    if (clashing.length > 0) {
      // Adding a dimension to variants that already exist is not a clash, it
      // is an expansion: a product that came in Gold and Silver now also
      // comes in two lengths. The existing variants are carried into the
      // fuller matrix keeping their SKU, barcode and received stock, rather
      // than the operator being told to delete and re-key them.
      if (clashing.every((set) => isDimensionUpgrade(set, incoming))) {
        const expanded = expandVariantsToDimensions(optionValues, variants);
        const added = expanded.length - variants.length;
        setVariants(expanded);
        toast.success(
          added > 0
            ? `Expanded to ${expanded.length} variants across ${describeDimensionSet(incoming)}`
            : `Variants now described by ${describeDimensionSet(incoming)}`,
        );
        return;
      }

      setError({
        title: "These options do not match the existing variants",
        message:
          `This would add variants described by ${describeDimensionSet(incoming)}, ` +
          `but the product already has variants described by ${clashing
            .map(describeDimensionSet)
            .join(" and ")}. Every variant has to use the same options, or the ` +
          `shop cannot say which is which. Remove the existing variants first, ` +
          `or add the missing option values so the combinations line up.`,
      });
      return;
    }

    appendVariants(newRows);
    toast.success(`${newRows.length} variant${newRows.length > 1 ? "s" : ""} generated`);
  };

  const addBlankVariant = () => appendVariants([blankVariant()]);

  // Removing a variant never touches images: they are filed under option
  // values, not variants, so the Gold photographs stay with "Gold".
  const removeVariant = (index: number) =>
    setVariants(variants.filter((_, i) => i !== index));

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
  const formRef = useRef<HTMLFormElement>(null);
  const [savingAction, setSavingAction] = useState<"draft" | "publish" | null>(null);

  const reportError = (message: string, title = "Something went wrong") =>
    setError({ title, message });

  const handleSave = async (publish: boolean) => {
    if (!formRef.current?.reportValidity()) return;

    if (publish) {
      const missing = checklist.filter((c) => !c.done);
      if (missing.length > 0) {
        setError({
          title: "Not ready to publish",
          message: "A few things are missing before this product can go live:",
          issues: missing.map((m) => m.label),
        });
        return;
      }
    }

    setSavingAction(publish ? "publish" : "draft");
    setLoading(true);

    try {
      const payload = buildProductPayload(formData, images, variants, publish);

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
        // The server's own message is the useful one — which variant still
        // has stock, which field failed validation — so it is shown as-is.
        const body = await res.json().catch(() => null);
        const issues = Array.isArray(body?.details)
          ? body.details.map((d: { path?: unknown[]; message?: string }) =>
              [d.path?.join("."), d.message].filter(Boolean).join(": "),
            )
          : undefined;
        setError({
          title: publish ? "Could not publish" : "Could not save",
          message: body?.error || "The server rejected the save. Nothing was changed.",
          issues,
        });
        return;
      }

      setFormData((prev) => ({ ...prev, isPublished: publish }));
      toast.success(publish ? "Product published" : "Draft saved");
      router.push("/admin/products");
      router.refresh();
    } catch {
      setError({
        title: publish ? "Could not publish" : "Could not save",
        message:
          "The server could not be reached. Nothing was changed — check the connection and try again.",
      });
    } finally {
      setLoading(false);
      setSavingAction(null);
    }
  };

  return {
    router,
    formRef,
    formData,
    handleChange,
    images,
    imagesInGroup,
    setImagesInGroup,
    moveImage,
    variants,
    optionValues,
    curatedOptions,
    addOptionValue,
    removeOptionValue,
    generateVariants,
    addBlankVariant,
    removeVariant,
    updateVariant,
    checklist,
    readyToPublish,
    loading,
    savingAction,
    handleSave,
    error,
    reportError,
    clearError: () => setError(null),
  };
}
