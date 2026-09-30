"use client";

import { useEffect, useState } from "react";
import type { QuoteView } from "@/lib/cart-quote";
import type { PosPaymentMethod } from "@/modules/orders";

export type PosQuote = QuoteView;

interface Line {
  variantId: string;
  quantity: number;
  overridePriceCents?: number;
  overrideReason?: string;
}

/**
 * The basket as the server will charge it: live offers, codes, manual prices
 * and GST. Re-asked (briefly debounced) whenever the basket, the codes or the
 * payment method change; a stale answer never overwrites a newer one.
 */
export function usePosQuote(lines: Line[], codes: string[], method: PosPaymentMethod) {
  const [quote, setQuote] = useState<PosQuote | null>(null);
  const [loading, setLoading] = useState(false);
  const key = JSON.stringify({ lines, codes, method });

  useEffect(() => {
    if (lines.length === 0) {
      setQuote(null);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/admin/pos/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({ lines, codes, paymentMethod: method }),
        });
        if (res.ok) {
          const body = await res.json();
          if (!body.empty) setQuote(body);
        }
      } catch {
        // Superseded or offline: the last good figures stay on screen.
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 150);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
    // `key` captures every input that changes the price.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { quote, loading };
}
