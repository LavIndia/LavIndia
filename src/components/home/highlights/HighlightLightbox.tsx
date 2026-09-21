"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { HighlightView } from "@/modules/marketing/client";
import { highlightMeta } from "@/components/home/highlights/highlight-display";
import { css } from "styled-system/css";

/**
 * A highlight at full size, with the rest of the gallery still reachable.
 *
 * The card can only hold a clamped line or two, and a description worth
 * writing is worth reading in full, so opening one shows the whole thing —
 * and the arrows move through the gallery without closing and reopening.
 *
 * Film plays here rather than on the card: an autoplaying grid of videos is
 * the fastest way to make a page feel cheap.
 */

const frameStyle = css({
  position: "relative",
  width: "full",
  aspectRatio: "4 / 3",
  borderRadius: "lg",
  overflow: "hidden",
  background: "onyx.900",
});
const videoStyle = css({ width: "full", height: "full", objectFit: "contain" });
const bodyStyle = css({ display: "flex", flexDirection: "column", gap: "2", paddingTop: "4" });
const kindStyle = css({
  alignSelf: "flex-start",
  paddingInline: "2.5",
  paddingBlock: "0.5",
  borderRadius: "full",
  fontSize: "2xs",
  fontWeight: "semibold",
  letterSpacing: "widest",
  textTransform: "uppercase",
  color: "accent.pressed",
  background: "gold.100",
});
const metaStyle = css({ fontSize: "sm", color: "fg.muted" });
const descriptionStyle = css({ fontSize: "sm", color: "fg.default", lineHeight: "relaxed" });
const linkStyle = css({
  display: "inline-flex",
  alignItems: "center",
  gap: "1",
  fontSize: "sm",
  fontWeight: "medium",
  color: "accent.pressed",
  "&:hover": { color: "accent.default" },
});
const footerStyle = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "3",
  paddingTop: "4",
});
const navStyle = css({ display: "flex", alignItems: "center", gap: "2" });
const countStyle = css({ fontSize: "xs", color: "fg.muted", fontVariantNumeric: "tabular-nums" });
const iconStyle = css({ width: "4", height: "4" });

export interface HighlightLightboxProps {
  highlights: HighlightView[];
  /** The highlight on show, or null when the lightbox is closed. */
  current: HighlightView | null;
  onChange: (highlight: HighlightView | null) => void;
}

export function HighlightLightbox({ highlights, current, onChange }: HighlightLightboxProps) {
  if (!current) return null;

  const index = highlights.findIndex((highlight) => highlight.id === current.id);
  const meta = highlightMeta(current);
  // Wraps, so the gallery has no dead end at either edge.
  const step = (offset: number) =>
    onChange(highlights[(index + offset + highlights.length) % highlights.length]);

  return (
    <Dialog open onOpenChange={(open) => !open && onChange(null)}>
      <DialogContent className={css({ maxWidth: "48rem" })}>
        <DialogTitle>{current.title}</DialogTitle>

        <div className={frameStyle}>
          {current.mediaType === "VIDEO" ? (
            <video
              src={current.mediaUrl}
              poster={current.posterUrl || undefined}
              className={videoStyle}
              controls
              playsInline
            />
          ) : (
            <Image
              src={current.mediaUrl}
              alt={current.title}
              fill
              sizes="(max-width: 768px) 100vw, 768px"
              className={css({ objectFit: "cover" })}
            />
          )}
        </div>

        <div className={bodyStyle}>
          {/* Every line here is dropped when it has nothing behind it. */}
          {current.kind && <span className={kindStyle}>{current.kind}</span>}
          {meta && <p className={metaStyle}>{meta}</p>}
          {current.description && <p className={descriptionStyle}>{current.description}</p>}
          {current.linkUrl && (
            <Link href={current.linkUrl} className={linkStyle}>
              Read more
              <ArrowRight className={iconStyle} />
            </Link>
          )}
        </div>

        {highlights.length > 1 && (
          <div className={footerStyle}>
            <span className={countStyle}>
              {index + 1} of {highlights.length}
            </span>
            <div className={navStyle}>
              <Button
                variant="outline"
                size="icon"
                onClick={() => step(-1)}
                aria-label="Previous highlight"
              >
                <ChevronLeft className={iconStyle} />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => step(1)}
                aria-label="Next highlight"
              >
                <ChevronRight className={iconStyle} />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
