"use client";

import { useEffect, type RefObject } from "react";

/**
 * Closes an inline popover on a tap outside it or on Escape — the behaviour
 * every editable cell on the stock screen shares.
 */
export function usePopoverDismiss(
  open: boolean,
  wrapRef: RefObject<HTMLElement | null>,
  close: () => void,
) {
  useEffect(() => {
    if (!open) return;
    const onAway = (event: PointerEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) close();
    };
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && close();
    document.addEventListener("pointerdown", onAway);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onAway);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, wrapRef, close]);
}
