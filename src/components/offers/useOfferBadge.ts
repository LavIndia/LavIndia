"use client";

import { useEffect, useState } from "react";

/**
 * The offer badge for a piece — "3 for ₹999" — from the live offers.
 *
 * Every card on a page shares one request: the first card to ask starts it,
 * the rest wait on the same answer. A failure simply shows no badges; the
 * offer still applies in the cart.
 */
let pending: Promise<Record<string, string>> | null = null;
let loadedAt = 0;

function loadBadges(): Promise<Record<string, string>> {
  // Refreshed at most once a minute within a visit, like the offers themselves.
  if (!pending || Date.now() - loadedAt > 60_000) {
    loadedAt = Date.now();
    pending = fetch("/api/offers")
      .then((r) => (r.ok ? r.json() : { badges: {} }))
      .then((body: { badges?: Record<string, string> }) => body.badges ?? {})
      .catch(() => ({}));
  }
  return pending;
}

export function useOfferBadge(productId: string): string | null {
  const [badge, setBadge] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    loadBadges().then((badges) => alive && setBadge(badges[productId] ?? null));
    return () => {
      alive = false;
    };
  }, [productId]);
  return badge;
}
