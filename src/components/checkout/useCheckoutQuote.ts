"use client";

import { useEffect, useState } from "react";
import type { QuoteView } from "@/lib/cart-quote";

export type CheckoutQuote = QuoteView & { codFeeCents: number; payableCents: number };

interface QuoteRequest {
  items: Array<{ id: string; variantId?: string | null; qty: number; image?: string | null }>;
  code: string | null;
  shippingMethod?: "standard" | "express";
  paymentMethod?: "upi" | "card" | "cod";
}

/**
 * The cart as the server will charge it — offers, GST, delivery and fees.
 *
 * Every figure the client sees comes from the same pricing path the order
 * route uses, so the total at checkout is the total charged. Requests are
 * debounced and a stale answer never overwrites a newer one.
 */
export function useCheckoutQuote({ items, code, shippingMethod, paymentMethod }: QuoteRequest) {
  const [quote, setQuote] = useState<CheckoutQuote | null>(null);
  const [loading, setLoading] = useState(false);

  const key = JSON.stringify({
    items: items.map((i) => [i.id, i.variantId ?? null, i.qty]),
    code,
    shippingMethod,
    paymentMethod,
  });

  useEffect(() => {
    if (items.length === 0) {
      setQuote(null);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/checkout/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            items: items.map((i) => ({
              productId: i.id,
              variantId: i.variantId ?? null,
              quantity: i.qty,
              image: i.image ?? null,
            })),
            code: code ?? undefined,
            shippingMethod,
            paymentMethod,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (!data.empty) setQuote(data as CheckoutQuote);
        }
      } catch {
        // An aborted or failed quote leaves the last good one on screen.
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
    // `key` captures every input that changes the price.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { quote, loading };
}
