"use client";

import { useState } from "react";
import { toast } from "sonner";

/** Shared inline stock-editing behavior for the products table and any other product list (e.g. the category-scoped dialog). */
export function useProductStockEditor(onUpdated?: () => void) {
  const [editingStock, setEditingStock] = useState<{ [key: string]: number }>({});

  const updateStock = async (productId: string, newStock: number) => {
    if (newStock < 0) return;

    try {
      // Goes through the Inventory domain, which records the change as an
      // adjustment with a reason. Writing Product.stock directly would move
      // stock silently and leave the real levels untouched.
      const res = await fetch("/api/admin/inventory/set-product-stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, quantity: newStock }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        // The server's message is the specific one — for example that the
        // product has several options and must be stocked per option.
        toast.error(data.error ?? "Could not update stock");
        return;
      }

      if (!data.unchanged) toast.success("Stock updated");
      onUpdated?.();
    } catch {
      toast.error("Could not reach the server. Nothing was changed.");
    }
  };

  const handleStockChange = (productId: string, value: string) => {
    const numValue = parseInt(value) || 0;
    setEditingStock((prev) => ({ ...prev, [productId]: numValue }));
  };

  const handleStockBlur = (productId: string, currentStock: number) => {
    const newStock = editingStock[productId];
    if (newStock !== undefined && newStock !== currentStock) {
      updateStock(productId, newStock);
    }
    setEditingStock((prev) => {
      const updated = { ...prev };
      delete updated[productId];
      return updated;
    });
  };

  const incrementStock = (productId: string, currentStock: number) => {
    updateStock(productId, currentStock + 1);
  };

  const decrementStock = (productId: string, currentStock: number) => {
    if (currentStock > 0) {
      updateStock(productId, currentStock - 1);
    }
  };

  return { editingStock, handleStockChange, handleStockBlur, incrementStock, decrementStock };
}
