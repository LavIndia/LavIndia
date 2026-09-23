"use client";

import { useCallback, useMemo, useState } from "react";
import { resolveCosts, savedCents, type CostBasis, type TypedCosts } from "./purchase-costs";
import type { LookupResult } from "./useVariantLookup";

export interface StockLineDraft extends TypedCosts {
  variant: LookupResult;
  quantity: number;
}

/** The money fields an operator can type on a purchase line. */
export type CostField = "listCost" | "agreedCost" | "unitCost";

/**
 * The basket of items being received or adjusted.
 *
 * Shared by Receive Stock and Adjustments because both are the same
 * interaction — build a list of items and quantities, then submit it with a
 * reason. Only the wrapper around it differs, and only Receive Stock fills
 * in the money.
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
      if (existing === -1) return [...current, { variant, quantity, costBasis: "UNIT" }];

      const next = [...current];
      next[existing] = { ...next[existing], quantity: next[existing].quantity + quantity };
      return next;
    });
  }, []);

  /** Applies a change to whichever line holds this variant. */
  const patchLine = useCallback(
    (variantId: string, change: Partial<StockLineDraft>) =>
      setLines((current) =>
        current.map((line) =>
          line.variant.variantId === variantId ? { ...line, ...change } : line,
        ),
      ),
    [],
  );

  const setQuantity = useCallback(
    (variantId: string, quantity: number) =>
      patchLine(variantId, { quantity: Math.max(1, Math.floor(quantity) || 1) }),
    [patchLine],
  );

  const setCost = useCallback(
    (variantId: string, field: CostField, value: string) =>
      patchLine(variantId, { [field]: value }),
    [patchLine],
  );

  const setCostBasis = useCallback(
    (variantId: string, costBasis: CostBasis) => patchLine(variantId, { costBasis }),
    [patchLine],
  );

  const removeLine = useCallback((variantId: string) => {
    setLines((current) => current.filter((line) => line.variant.variantId !== variantId));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const totalUnits = useMemo(
    () => lines.reduce((total, line) => total + line.quantity, 0),
    [lines],
  );

  /** What the delivery comes to, and what was knocked off it. */
  const totals = useMemo(() => {
    let costCents = 0;
    let savedTotal = 0;
    let linesWithoutCost = 0;

    for (const line of lines) {
      const resolved = resolveCosts(line, line.quantity);
      if (resolved.unitCostCents === undefined) linesWithoutCost += 1;
      else costCents += resolved.unitCostCents * line.quantity;

      const saved = savedCents(resolved, line.quantity);
      if (saved !== null) savedTotal += saved;
    }

    return { costCents, savedCents: savedTotal, linesWithoutCost };
  }, [lines]);

  /** The shape the API expects, built once here rather than at each call site. */
  const toPayload = useCallback(
    () =>
      lines.map((line) => ({
        variantId: line.variant.variantId,
        quantity: line.quantity,
        ...resolveCosts(line, line.quantity),
      })),
    [lines],
  );

  return {
    lines,
    addVariant,
    setQuantity,
    setCost,
    setCostBasis,
    removeLine,
    clear,
    totalUnits,
    totals,
    toPayload,
  };
}
