"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { takeQueuedReceive, type ReceiveHandoffItem } from "@/lib/receive-handoff";
import type { LookupResult } from "./useVariantLookup";

/**
 * Pre-fills the delivery list with pieces just added in Products, taken from
 * the hand-off (a bulk upload) or from ?product=<id> (a single piece). One
 * lookup for all of them; the operator then only confirms quantities and the
 * bill details.
 */
export function useReceiveHandoff(
  locationId: string | undefined,
  onLine: (variant: LookupResult, quantity: number) => void,
) {
  const params = useSearchParams();
  const productParam = params.get("product");
  const ran = useRef(false);
  const onLineRef = useRef(onLine);
  onLineRef.current = onLine;

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const items: ReceiveHandoffItem[] = takeQueuedReceive();
    if (productParam) items.push({ productId: productParam });
    if (items.length === 0) return;

    const quantityByProduct = new Map(items.map((i) => [i.productId, Math.max(1, i.quantity ?? 1)]));

    fetch("/api/admin/inventory/lookup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productIds: [...quantityByProduct.keys()], locationId }),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then(({ results }: { results: LookupResult[] }) => {
        for (const variant of results) {
          if (variant.isActive) onLineRef.current(variant, quantityByProduct.get(variant.productId) ?? 1);
        }
        if (results.length > 0) toast.success("Pieces you just added are in the list — check quantities, then Receive stock");
      })
      .catch(() => toast.error("Could not load the pieces you just added — search for them instead"));
  }, [productParam, locationId]);
}
