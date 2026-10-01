import { css } from "styled-system/css";

/**
 * The words on a hero slide — the headline and supporting text an admin
 * writes on the banner form — set over the artwork. Each line is left out
 * when it is empty, and the whole caption (scrim included) when both are, so
 * a banner whose artwork carries its own words is shown exactly as before.
 * What counts as a headline is decided in `@/lib/hero-caption`.
 */

// A soft onyx wash from the bottom-left so ivory type reads on any artwork,
// without dimming the rest of the picture.
const scrimStyle = css({
  position: "absolute",
  inset: "0",
  pointerEvents: "none",
  display: "flex",
  alignItems: "flex-end",
  background:
    "linear-gradient(to top, rgba(18,17,16,0.72) 0%, rgba(18,17,16,0.32) 38%, rgba(18,17,16,0) 64%)",
  md: {
    alignItems: "center",
    background:
      "linear-gradient(to right, rgba(18,17,16,0.62) 0%, rgba(18,17,16,0.28) 42%, rgba(18,17,16,0) 68%)",
  },
});

// Bottom padding on phones clears the slide dots; on desktop the copy sits
// clear of the arrows at the left edge.
const copyStyle = css({
  display: "flex",
  flexDirection: "column",
  gap: "2",
  maxWidth: "full",
  paddingInline: "6",
  paddingBottom: "14",
  md: { maxWidth: "36rem", gap: "3", paddingInline: "20", paddingBottom: "0" },
  lg: { maxWidth: "42rem", paddingInline: "24" },
});

const ruleStyle = css({
  width: "10",
  height: "1px",
  background: "linear-gradient(90deg, {colors.gold.300}, {colors.gold.500})",
  md: { width: "14" },
});

const headlineStyle = css({
  fontFamily: "display",
  fontWeight: "medium",
  color: "ivory.50",
  letterSpacing: "tight",
  lineHeight: "1.1",
  fontSize: "2xl",
  textWrap: "balance",
  textShadow: "0 2px 18px rgba(0,0,0,0.35)",
  md: { fontSize: "4xl" },
  lg: { fontSize: "5xl" },
});

const subtitleStyle = css({
  color: "ivory.200",
  fontSize: "sm",
  lineHeight: "1.5",
  letterSpacing: "wide",
  lineClamp: "2",
  textShadow: "0 1px 12px rgba(0,0,0,0.35)",
  md: { fontSize: "lg", lineClamp: "3" },
});

export function HeroSlideCaption({ headline, subtitle }: { headline: string; subtitle: string }) {
  if (!headline && !subtitle) return null;

  return (
    <div className={scrimStyle}>
      <div className={copyStyle}>
        <span aria-hidden className={ruleStyle} />
        {headline && <h2 className={headlineStyle}>{headline}</h2>}
        {subtitle && <p className={subtitleStyle}>{subtitle}</p>}
      </div>
    </div>
  );
}
