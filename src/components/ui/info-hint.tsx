"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Info } from "lucide-react";
import { css, cx } from "styled-system/css";

/**
 * A small "what does this mean" hint.
 *
 * Built rather than pulled from a library because a plain hover tooltip is
 * not enough here: the admin is used on tablets, where there is no hover, and
 * an explanation nobody can reach on a touch screen is not an explanation.
 * So this opens on hover, on focus and on tap, closes on Escape or an outside
 * tap, and is wired to the trigger with `aria-describedby` so a screen reader
 * announces it too.
 */
const wrapStyle = css({ display: "inline-flex", position: "relative", verticalAlign: "middle" });

const triggerStyle = css({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  height: "4",
  width: "4",
  marginLeft: "1.5",
  borderRadius: "full",
  color: "fg.muted",
  cursor: "help",
  transition: "color 0.15s ease",
  "&:hover, &:focus-visible": { color: "accent.pressed" },
  "&:focus-visible": { outline: "2px solid", outlineColor: "accent.default", outlineOffset: "2px" },
});

const bubbleStyle = css({
  position: "absolute",
  zIndex: "60",
  bottom: "calc(100% + 8px)",
  left: "50%",
  transform: "translateX(-50%)",
  width: "max-content",
  maxWidth: "17rem",
  padding: "2.5",
  borderRadius: "md",
  border: "1px solid",
  borderColor: "border.subtle",
  background: "bg.surface",
  boxShadow: "lg",
  fontSize: "xs",
  lineHeight: "relaxed",
  fontWeight: "normal",
  color: "fg.default",
  textAlign: "left",
  textTransform: "none",
  letterSpacing: "normal",
  whiteSpace: "normal",
});

// Flipped below the trigger for hints near the top of the page, where a
// bubble above would be clipped.
const bubbleBelowStyle = css({
  bottom: "auto",
  top: "calc(100% + 8px)",
});

export function InfoHint({
  label,
  children,
  below,
  className,
}: {
  /** Describes what the hint is about, for screen readers: "About available stock". */
  label: string;
  children: React.ReactNode;
  below?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const wrapRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  return (
    <span className={cx(wrapStyle, className)} ref={wrapRef}>
      <button
        type="button"
        className={triggerStyle}
        aria-label={label}
        aria-describedby={open ? id : undefined}
        aria-expanded={open}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={(event) => {
          // Tap toggles, which is the only way to reach this on a tablet.
          event.preventDefault();
          setOpen((v) => !v);
        }}
      >
        <Info className={css({ height: "3.5", width: "3.5" })} />
      </button>

      {open && (
        <span id={id} role="tooltip" className={cx(bubbleStyle, below && bubbleBelowStyle)}>
          {children}
        </span>
      )}
    </span>
  );
}
