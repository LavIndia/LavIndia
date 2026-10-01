"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/** An A4 page's width in CSS pixels (210mm at 96 dpi). */
const PAGE_WIDTH_PX = 793.7;
/** The preview never shows the page larger than this on a wide screen. */
const MAX_SCALE = 0.78;

/**
 * Shows an A4 document scaled to fit the space it is given.
 *
 * On a desktop that is the familiar 78% preview; on a phone the whole page
 * shrinks to the screen's width instead of being cropped and scrolled
 * sideways. The outer box reserves the SCALED size — measured, so a two-page
 * invoice is not clipped — and the inner one does the scaling. Printing
 * ignores all of this: the print stylesheet removes the transform, so what
 * comes out is the page at full size.
 */
export function ScaledPage({ children }: { children: ReactNode }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(MAX_SCALE);
  const [height, setHeight] = useState<number | null>(null);

  useEffect(() => {
    const frame = outer.current?.parentElement;
    const page = inner.current;
    if (!frame || !page) return;
    const measure = () => {
      const style = getComputedStyle(frame);
      const available =
        frame.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      const next = Math.min(MAX_SCALE, available / PAGE_WIDTH_PX);
      setScale(next);
      setHeight(page.offsetHeight * next);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    observer.observe(page);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={outer}
      style={{ width: PAGE_WIDTH_PX * scale, height: height ?? `${297 * MAX_SCALE}mm` }}
    >
      <div
        ref={inner}
        className="invoice-print-area"
        style={{ width: "210mm", transform: `scale(${scale})`, transformOrigin: "top left" }}
      >
        {children}
      </div>
    </div>
  );
}
