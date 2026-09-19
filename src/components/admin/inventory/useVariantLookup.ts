"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * A sellable item as the inventory and POS screens see it: enough to
 * recognise it and to know whether it can be sold.
 */
export interface LookupResult {
  variantId: string;
  productId: string;
  productName: string;
  variantName: string;
  isDefault: boolean;
  sku: string | null;
  barcode: string | null;
  priceCents: number;
  imageUrl: string | null;
  isActive: boolean;
  quantity: number;
  reservedQuantity: number;
  available: number;
}

/**
 * Resolving a scanned or typed code, shared by every screen that needs one.
 *
 * A camera scan, a hardware scanner and a typed code all produce a string, so
 * they all arrive here and go to the same endpoint. That is what lets a
 * Bluetooth scanner be added later without any screen changing: a hardware
 * scanner types into the field and presses Enter, which is already handled.
 */
export function useVariantLookup(options: { locationId?: string } = {}) {
  const [results, setResults] = useState<LookupResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [notFoundCode, setNotFoundCode] = useState<string | null>(null);

  // Only the latest request may update state — a fast typist or a scanner
  // burst otherwise lets a slow earlier response overwrite a newer one.
  const requestRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const run = useCallback(
    async (params: { code?: string; q?: string }): Promise<LookupResult[]> => {
      const requestId = ++requestRef.current;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setNotFoundCode(null);

      const search = new URLSearchParams();
      if (params.code) search.set("code", params.code);
      if (params.q) search.set("q", params.q);
      if (options.locationId) search.set("locationId", options.locationId);

      try {
        const response = await fetch(`/api/admin/inventory/lookup?${search}`, {
          signal: controller.signal,
        });
        const data = await response.json();

        if (requestId !== requestRef.current) return [];

        const found: LookupResult[] = data.results ?? [];
        setResults(found);

        // An unrecognised barcode never creates anything — the screen says so
        // and offers a manual search instead.
        if (params.code && found.length === 0) setNotFoundCode(params.code);

        return found;
      } catch (error) {
        if ((error as Error).name === "AbortError") return [];
        if (requestId === requestRef.current) setResults([]);
        return [];
      } finally {
        if (requestId === requestRef.current) setLoading(false);
      }
    },
    [options.locationId],
  );

  const lookupByCode = useCallback((code: string) => run({ code }), [run]);
  const search = useCallback((q: string) => run({ q }), [run]);

  const reset = useCallback(() => {
    setResults([]);
    setNotFoundCode(null);
  }, []);

  return { results, loading, notFoundCode, lookupByCode, search, reset };
}
