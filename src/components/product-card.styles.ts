import { css, cx } from "styled-system/css";

/**
 * Presentation for the product card.
 *
 * Kept beside the component rather than inside it so the card file stays
 * about behaviour — what a click does, what state it holds — and so another
 * grid can reuse the same visual language without copying it.
 */

// Restrained, editorial treatment (per 2026 luxury e-commerce research: quiet
// whitespace-led grids, no decorative framing, large imagery, minimal text)
// — the card itself carries no border/background; separation between cards
// comes from grid gutter spacing (set by the parent grid), not a box.
export const cardStyle = css({ background: "transparent" });

export const imageBoxStyle = css({
  display: "block",
  position: "relative",
  width: "full",
  aspectRatio: "1 / 1",
  overflow: "hidden",
  borderRadius: "lg",
  background: "bg.surface",
  boxShadow: "0 1px 2px rgba(31,29,27,0.06)",
  transition: "box-shadow 0.35s ease",
  "&:hover": { boxShadow: "card" },
  "&:hover img": { transform: "scale(1.045)" },
});

export const imageStyle = css({
  objectFit: "cover",
  transition: "transform 0.6s cubic-bezier(0.22,1,0.36,1)",
});

export const wishlistButtonStyle = cx(
  css({
    position: "absolute",
    top: "3",
    right: "3",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "full",
    padding: "2",
    cursor: "pointer",
    background: "bg.glassStrong",
    backdropBlur: "glassSm",
    color: "fg.muted",
    transition: "all 0.2s ease",
    "&:hover": { background: "danger", color: "white" },
    "&:disabled": { opacity: 0.5, cursor: "not-allowed" },
  })
);

export const quickViewButtonStyle = css({
  position: "absolute",
  bottom: "3",
  right: "3",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "full",
  padding: "2",
  cursor: "pointer",
  background: "bg.glassStrong",
  backdropBlur: "glassSm",
  color: "fg.muted",
  boxShadow: "0 1px 3px rgba(31,29,27,0.12)",
  // Hidden at rest so the grid stays quiet, but it has to be reachable by
  // every input: the card reveals it on hover, the keyboard reveals it on
  // focus, and a touch screen — which can never hover — always shows it.
  opacity: 0,
  transform: "translateY(4px)",
  transition: "opacity 0.2s ease, transform 0.2s ease, background 0.2s ease, color 0.2s ease",
  "&:focus-visible": {
    opacity: 1,
    transform: "translateY(0)",
    outline: "none",
    boxShadow: "0 0 0 3px token(colors.gold.200)",
  },
  "@media (hover: none)": { opacity: 1, transform: "translateY(0)" },
  "&:hover": { background: "bg.glass", color: "accent.pressed" },
});

/**
 * Revealing the quick-view control.
 *
 * Keyed off the whole card rather than the image alone: a customer reading
 * the name and price has their pointer below the image, and having the
 * control disappear at exactly that moment is what makes people conclude the
 * feature does not work.
 */
export const cardHoverStyle = css({
  "&:hover .quick-view-trigger": { opacity: 1, transform: "translateY(0)" },
  "&:focus-within .quick-view-trigger": { opacity: 1, transform: "translateY(0)" },
});

export const shareButtonStyle = css({
  position: "absolute",
  top: "14",
  right: "3",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "full",
  padding: "2",
  cursor: "pointer",
  background: "bg.glassStrong",
  backdropBlur: "glassSm",
  color: "fg.muted",
  transition: "all 0.2s ease",
  "&:hover": { background: "bg.glass", color: "accent.pressed" },
});

export const shareIconStyle = css({ width: "4.5", height: "4.5" });

export const wishlistActiveStyle = css({
  background: "danger",
  color: "white",
});

export const bodyStyle = css({ paddingTop: "3.5" });

export const titleStyle = css({
  fontFamily: "display",
  fontSize: "md",
  fontWeight: "medium",
  letterSpacing: "wide",
  color: "fg.default",
  "&:hover": { color: "accent.pressed" },
});

export const priceRowStyle = css({
  marginTop: "1.5",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "2",
});

export const priceGroupStyle = css({ display: "flex", alignItems: "baseline", gap: "2", flexWrap: "wrap" });

export const priceStyle = css({ fontFamily: "display", fontSize: "md", fontWeight: "semibold", color: "fg.default" });

export const compareAtStyle = css({ fontSize: "xs", color: "fg.muted", textDecoration: "line-through" });


export const lowStockStyle = css({ marginTop: "1", fontSize: "xs", fontWeight: "medium", color: "gold.600" });

// One quiet tag, not a wall of stickers — a card carrying every eligible
// label at once reads as discount-bin, not atelier. Rank the most telling
// claim first and show only that.
export const tagStyle = css({
  position: "absolute",
  top: "3",
  left: "3",
  paddingInline: "2.5",
  paddingBlock: "1",
  borderRadius: "full",
  fontSize: "2xs",
  fontWeight: "semibold",
  letterSpacing: "wider",
  textTransform: "uppercase",
  backdropBlur: "glassSm",
});

export const tagFeaturedStyle = css({
  background: "linear-gradient(135deg, {colors.gold.300}, {colors.gold.500})",
  color: "fg.onGold",
});

export const tagLimitedStyle = css({
  background: "rgba(24,22,20,0.82)",
  color: "gold.200",
  border: "1px solid",
  borderColor: "gold.400",
});

export const tagBestSellerStyle = css({
  background: "rgba(24,22,20,0.78)",
  color: "ivory.50",
});

export const tagNewArrivalStyle = css({
  background: "bg.glassStrong",
  color: "fg.default",
  border: "1px solid",
  borderColor: "border.glass",
});
