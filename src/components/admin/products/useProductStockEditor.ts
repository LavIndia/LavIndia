"use client";

import { useState } from "react";
import { toast } from "sonner";

/** Shared inline stock-editing behavior for the products table and any other product list (e.g. the category-scoped dialog). */
export function useProductStockEditor(onUpdated?: () => void) {
  const [editingStock, setEditingStock] = useState<{ [key: string]: number }>({});

  const updateStock = async (productId: string, newStock: number) => {
    if (newStock < 0) return;

    try {
      const res = await fetch(`/api/admin/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stock: newStock }),
      });

      if (!res.ok) throw new Error("Failed to update stock");

      toast.success("Stock updated");
      onUpdated?.();
    } catch {
      toast.error("Failed to update stock");
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
