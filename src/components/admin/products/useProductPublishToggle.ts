"use client";

import { useState } from "react";
import { toast } from "sonner";

/** Shared inline publish/draft toggling for the products table and any other product list (e.g. the category-scoped dialog). */
export function useProductPublishToggle(onUpdated?: () => void) {
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const togglePublished = async (productId: string, currentStatus: boolean) => {
    setTogglingId(productId);
    try {
      const res = await fetch(`/api/admin/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: !currentStatus }),
      });

      if (!res.ok) throw new Error("Failed to update product");

      toast.success(currentStatus ? "Product moved to draft" : "Product published");
      onUpdated?.();
    } catch {
      toast.error("Failed to update product");
    } finally {
      setTogglingId(null);
    }
  };

  return { togglingId, togglePublished };
}
