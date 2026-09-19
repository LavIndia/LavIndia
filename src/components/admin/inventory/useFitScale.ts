"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** CSS millimetres to pixels at the standard 96dpi the browser assumes. */
const PX_PER_MM = 96 / 25.4;

/**
 * A scale factor that makes something of a known physical width fit the box
 * it is rendered in.
 *
 * A printed sheet has a real width — 210mm for A4 — and previewing it at a
 * hardcoded scale means the preview either overflows on a narrow window or
 * wastes half the column on a wide one. Overflowing is the worse of the two:
 * it forces the reader to scroll sideways to see the right-hand column of a
 * sheet, which defeats the point of showing the whole sheet at once.
 *
 * So the scale is measured rather than guessed, and recomputed whenever the
 * container changes size.
 *
 * @param contentWidthMm physical width of the thing being scaled
 * @param maxScale       ceiling, so small stock is enlarged but not blown up
 */
export function useFitScale(contentWidthMm: number, maxScale = 1) {
  const [available, setAvailable] = useState<number | null>(null);
  const element = useRef<HTMLDivElement | null>(null);

  const ref = useCallback((node: HTMLDivElement | null) => {
    element.current = node;
    if (node) setAvailable(node.clientWidth);
  }, []);

  useEffect(() => {
    const node = element.current;
    if (!node || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(([entry]) => {
      setAvailable(entry.contentRect.width);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const contentWidthPx = contentWidthMm * PX_PER_MM;
  // Before the first measurement, render at the ceiling rather than at zero:
  // a brief oversize beats a flash of nothing.
  const scale =
    available === null
      ? maxScale
      : Math.max(0.1, Math.min(maxScale, available / contentWidthPx));

  return { ref, scale, contentWidthPx };
}
