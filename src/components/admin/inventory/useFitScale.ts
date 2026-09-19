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
export function useFitScale(
  contentWidthMm: number,
  maxScale = 1,
  /**
   * Physical height, when the whole thing should be visible at once rather
   * than merely fitting across. Fitting only the width leaves an A4 sheet
   * three screens tall — technically not overflowing sideways, but the
   * operator still cannot see the page they are about to print.
   */
  contentHeightMm?: number,
) {
  const [box, setBox] = useState<{ width: number; height: number } | null>(null);
  const element = useRef<HTMLDivElement | null>(null);

  const measure = useCallback((node: HTMLDivElement) => {
    // Height is what is left between the top of the frame and the bottom of
    // the window, less a gutter so the sheet never sits flush against the
    // edge of the screen.
    const top = node.getBoundingClientRect().top;
    setBox({
      width: node.clientWidth,
      height: Math.max(240, window.innerHeight - top - 32),
    });
  }, []);

  const ref = useCallback(
    (node: HTMLDivElement | null) => {
      element.current = node;
      if (node) measure(node);
    },
    [measure],
  );

  useEffect(() => {
    const node = element.current;
    if (!node) return;

    const onChange = () => measure(node);
    window.addEventListener("resize", onChange);
    window.addEventListener("scroll", onChange, { passive: true });

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(onChange);
      observer.observe(node);
    }

    return () => {
      window.removeEventListener("resize", onChange);
      window.removeEventListener("scroll", onChange);
      observer?.disconnect();
    };
  }, [measure]);

  const contentWidthPx = contentWidthMm * PX_PER_MM;
  const contentHeightPx = contentHeightMm ? contentHeightMm * PX_PER_MM : null;

  // Before the first measurement, render at the ceiling rather than at zero:
  // a brief oversize beats a flash of nothing.
  let scale = maxScale;
  if (box) {
    const byWidth = box.width / contentWidthPx;
    const byHeight = contentHeightPx ? box.height / contentHeightPx : Infinity;
    scale = Math.max(0.1, Math.min(maxScale, byWidth, byHeight));
  }

  return { ref, scale, contentWidthPx };
}
