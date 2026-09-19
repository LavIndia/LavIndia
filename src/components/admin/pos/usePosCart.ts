"use client";

import { useCallback, useMemo, useState } from "react";
import { GST_RATE_BPS } from "@/modules/orders";
import { taxFromBps } from "@/modules/_shared/money";
import type { LookupResult } from "@/components/admin/inventory/useVariantLookup";

export interface PosCartLine {
  variant: LookupResult;
  quantity: number;
  /** Set only when the price was deliberately changed at the counter. */
  overridePriceCents?: number;
  overrideReason?: string;
}

/**
 * The basket at the counter.
 *
 * Totals are computed here purely so the operator sees them update as they
 * scan — the server recalculates everything from the catalog when the sale is
 * committed, and its figures are the ones that count. A client that could set
 * its own prices would be a shop anyone could rob with a browser console.
 */
export function usePosCart() {
  const [lines, setLines] = useState<PosCartLine[]>([]);

  const addVariant = useCallback((variant: LookupResult) => {
    setLines((current) => {
      const index = current.findIndex((line) => line.variant.variantId === variant.variantId);
      if (index === -1) return [...current, { variant, quantity: 1 }];
      const next = [...current];
      next[index] = { ...next[index], quantity: next[index].quantity + 1 };
      return next;
    });
  }, []);

  const setQuantity = useCallback((variantId: string, quantity: number) => {
    setLines((current) =>
      current.flatMap((line) => {
        if (line.variant.variantId !== variantId) return [line];
        const next = Math.floor(quantity);
        // Dropping to zero removes the line, which is what tapping down to
        // nothing is meant to do at a counter.
        if (next <= 0) return [];
        return [{ ...line, quantity: next }];
      }),
    );
  }, []);

  const setOverride = useCallback(
    (variantId: string, priceCents: number | undefined, reason?: string) => {
      setLines((current) =>
        current.map((line) =>
          line.variant.variantId === variantId
            ? { ...line, overridePriceCents: priceCents, overrideReason: reason }
            : line,
        ),
      );
    },
    [],
  );

  const removeLine = useCallback((variantId: string) => {
    setLines((current) => current.filter((line) => line.variant.variantId !== variantId));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const totals = useMemo(() => {
    let subtotal = 0;
    let discount = 0;

    for (const line of lines) {
      const catalog = line.variant.priceCents;
      const charged = line.overridePriceCents ?? catalog;
      subtotal += charged * line.quantity;
      discount += Math.max(0, catalog - charged) * line.quantity;
    }

    const tax = taxFromBps(subtotal, GST_RATE_BPS);
    return {
      subtotalCents: subtotal,
      discountCents: discount,
      taxCents: tax,
      grandTotalCents: subtotal + tax,
      itemCount: lines.reduce((sum, line) => sum + line.quantity, 0),
    };
  }, [lines]);

  /** Any line asking for more than is on the shelf blocks the sale. */
  const overstocked = useMemo(
    () => lines.filter((line) => line.quantity > line.variant.available),
    [lines],
  );

  const toPayload = useCallback(
    () =>
      lines.map((line) => ({
        variantId: line.variant.variantId,
        quantity: line.quantity,
        overridePriceCents: line.overridePriceCents,
        overrideReason: line.overrideReason,
      })),
    [lines],
  );

  return {
    lines,
    addVariant,
    setQuantity,
    setOverride,
    removeLine,
    clear,
    totals,
    overstocked,
    toPayload,
  };
}
