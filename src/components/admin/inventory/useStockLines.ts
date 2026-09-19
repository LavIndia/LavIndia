"use client";

import { useCallback, useMemo, useState } from "react";
import type { LookupResult } from "./useVariantLookup";

export interface StockLineDraft {
  variant: LookupResult;
  quantity: number;
}

/**
 * The basket of items being received or adjusted.
 *
 * Shared by Receive Stock and Adjustments because both are the same
 * interaction — build a list of items and quantities, then submit it with a
 * reason. Only the wrapper around it differs.
 */
export function useStockLines() {
  const [lines, setLines] = useState<StockLineDraft[]>([]);

  /**
   * Scanning the same item twice increments it rather than adding a second
   * row. That is what an operator scanning a tray of identical pieces
   * expects, and it keeps one variant to one line, which the server requires
   * anyway.
   */
  const addVariant = useCallback((variant: LookupResult, quantity = 1) => {
    setLines((current) => {
      const existing = current.findIndex((line) => line.variant.variantId === variant.variantId);
      if (existing === -1) return [...current, { variant, quantity }];

      const next = [...current];
      next[existing] = { ...next[existing], quantity: next[existing].quantity + quantity };
      return next;
    });
  }, []);

  const setQuantity = useCallback((variantId: string, quantity: number) => {
    setLines((current) =>
      current.map((line) =>
        line.variant.variantId === variantId
          ? { ...line, quantity: Math.max(1, Math.floor(quantity) || 1) }
          : line,
      ),
    );
  }, []);

  const removeLine = useCallback((variantId: string) => {
    setLines((current) => current.filter((line) => line.variant.variantId !== variantId));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const totalUnits = useMemo(
    () => lines.reduce((total, line) => total + line.quantity, 0),
    [lines],
  );

  /** The shape the API expects, built once here rather than at each call site. */
  const toPayload = useCallback(
    () => lines.map((line) => ({ variantId: line.variant.variantId, quantity: line.quantity })),
    [lines],
  );

  return { lines, addVariant, setQuantity, removeLine, clear, totalUnits, toPayload };
}
