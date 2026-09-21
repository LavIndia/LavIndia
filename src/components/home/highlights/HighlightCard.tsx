"use client";

import Image from "next/image";
import { Play } from "lucide-react";
import type { HighlightView } from "@/modules/marketing/client";
import { highlightMeta } from "@/components/home/highlights/highlight-display";
import { css, cx } from "styled-system/css";

/**
 * One highlight, as a portrait card.
 *
 * Full-bleed media with the words laid over it rather than beneath it: these
 * are photographs of a stand or a counter, and boxing them into a thumbnail
 * with a caption underneath makes them look like stock imagery. The scrim is
 * what keeps the text legible whatever the photograph is doing.
 *
 * The medium is a property of the highlight, so a film shows its poster with
 * a play badge and otherwise behaves exactly like an image — the band needs
 * no second layout when film is added.
 */

const cardStyle = css({
  position: "relative",
  flexShrink: 0,
  scrollSnapAlign: "start",
  width: "17.5rem",
  height: "23rem",
  sm: { width: "19rem", height: "25rem" },
  md: { width: "21rem", height: "27rem" },
  borderRadius: "2xl",
  overflow: "hidden",
  cursor: "pointer",
  border: "1px solid",
  borderColor: "border.subtle",
  background: "bg.surface",
  textAlign: "left",
  transition: "transform 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease",
  boxShadow: "card",
  "&:hover": {
    transform: "translateY(-6px)",
    borderColor: "accent.default",
    boxShadow: "glassLg",
  },
  "&:focus-visible": { outline: "2px solid", outlineColor: "accent.default", outlineOffset: "2px" },
});

const mediaStyle = css({
  objectFit: "cover",
  transition: "transform 0.6s ease",
  ".group:hover &": { transform: "scale(1.06)" },
});

const scrimStyle = css({
  position: "absolute",
  inset: "0",
  background:
    "linear-gradient(to top, rgba(12,11,10,0.92) 0%, rgba(12,11,10,0.55) 38%, rgba(12,11,10,0.05) 72%)",
});

const kindStyle = css({
  position: "absolute",
  top: "4",
  left: "4",
  paddingInline: "3",
  paddingBlock: "1",
  borderRadius: "full",
  fontSize: "2xs",
  fontWeight: "semibold",
  letterSpacing: "widest",
  textTransform: "uppercase",
  color: "fg.onGold",
  background: "linear-gradient(135deg, {colors.gold.300}, {colors.gold.500})",
});

const playStyle = css({
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "14",
  height: "14",
  borderRadius: "full",
  background: "rgba(255,253,248,0.16)",
  backdropFilter: "blur(6px)",
  border: "1px solid rgba(255,253,248,0.45)",
  color: "ivory.50",
});

const captionStyle = css({
  position: "absolute",
  insetX: "0",
  bottom: "0",
  padding: "5",
  display: "flex",
  flexDirection: "column",
  gap: "1.5",
});

const titleStyle = css({
  fontFamily: "display",
  fontSize: "lg",
  md: { fontSize: "xl" },
  fontWeight: "semibold",
  color: "ivory.50",
  lineHeight: "snug",
  lineClamp: "2",
});

const metaStyle = css({
  fontSize: "xs",
  letterSpacing: "wide",
  color: "gold.200",
});

const descriptionStyle = css({
  fontSize: "sm",
  color: "rgba(255,253,248,0.78)",
  lineClamp: "2",
});

export function HighlightCard({
  highlight,
  onOpen,
}: {
  highlight: HighlightView;
  onOpen: (highlight: HighlightView) => void;
}) {
  const meta = highlightMeta(highlight);
  const isVideo = highlight.mediaType === "VIDEO";
  // A film shows its poster; without one there is nothing to show but the
  // file itself, which a still frame handles badly, so the card falls back
  // to the media url and lets the browser draw its first frame.
  const still = isVideo ? highlight.posterUrl || highlight.mediaUrl : highlight.mediaUrl;

  return (
    <button
      type="button"
      className={cx("group", cardStyle)}
      onClick={() => onOpen(highlight)}
      aria-label={`Open highlight: ${highlight.title}`}
    >
      <Image
        src={still}
        alt={highlight.title}
        fill
        sizes="(max-width: 640px) 280px, (max-width: 768px) 304px, 336px"
        className={mediaStyle}
      />
      <div className={scrimStyle} />

      {highlight.kind && <span className={kindStyle}>{highlight.kind}</span>}
      {isVideo && (
        <span className={playStyle}>
          <Play className={css({ width: "6", height: "6" })} />
        </span>
      )}

      <div className={captionStyle}>
        <h3 className={titleStyle}>{highlight.title}</h3>
        {/* Both lines are omitted rather than left blank when empty. */}
        {meta && <p className={metaStyle}>{meta}</p>}
        {highlight.description && (
          <p className={descriptionStyle}>{highlight.description}</p>
        )}
      </div>
    </button>
  );
}
