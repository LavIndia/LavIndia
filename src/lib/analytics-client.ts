"use client";

const SESSION_KEY = "lavindia_analytics_sid";

/** Anonymous per-tab session id, not tied to any account — works for signed-out shoppers too. */
function getSessionId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    // sessionStorage can throw in some privacy modes — fall back to a
    // one-off id rather than crashing analytics into breaking the page.
    return crypto.randomUUID();
  }
}

type TrackEventInput = {
  productId: string;
  type: "VIEW" | "ADD_TO_CART";
  durationMs?: number;
};

export function trackProductEvent({ productId, type, durationMs }: TrackEventInput) {
  if (typeof window === "undefined") return;
  const payload = JSON.stringify({
    productId,
    type,
    sessionId: getSessionId(),
    durationMs,
  });

  // sendBeacon survives page unload (the exact moment a "view duration"
  // event fires); fetch with keepalive is the fallback for browsers/paths
  // where beacon isn't available.
  if (navigator.sendBeacon) {
    const blob = new Blob([payload], { type: "text/plain" });
    navigator.sendBeacon("/api/analytics/track", blob);
  } else {
    fetch("/api/analytics/track", {
      method: "POST",
      body: payload,
      keepalive: true,
    }).catch(() => {});
  }
}
