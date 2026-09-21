"use client";

import { useState } from "react";
import { Award } from "lucide-react";
import type { HighlightView } from "@/modules/marketing/client";
import { HighlightCard } from "@/components/home/highlights/HighlightCard";
import { HighlightLightbox } from "@/components/home/highlights/HighlightLightbox";
import { css } from "styled-system/css";

/**
 * The band that shows the house off: expo stands, pop-up counters, awards,
 * press.
 *
 * Dressed like every other band on the homepage — the same ivory-to-gold
 * ground, the same gold icon badge, the same heading treatment — because a
 * section that is new to the page should not also be new to the palette.
 * What sets it apart is the cards: portrait photographs with the words laid
 * over them, the way the collection tiles already work.
 *
 * Renders nothing at all until an admin has added something, rather than an
 * empty-state message: an unfinished section is worse on a storefront than a
 * missing one.
 */

const sectionStyle = css({
  paddingY: "12",
  md: { paddingY: "16" },
  background: "linear-gradient(to bottom, {colors.ivory.50}, {colors.ivory.100})",
});
const containerStyle = css({ marginX: "auto", paddingX: "4", maxWidth: "8xl" });
const headerStyle = css({
  display: "flex",
  alignItems: "center",
  gap: "3",
  marginBottom: "6",
  md: { marginBottom: "8" },
});
const badgeStyle = css({
  padding: "3",
  borderRadius: "full",
  background: "linear-gradient(135deg, {colors.gold.300}, {colors.gold.500})",
  color: "fg.onGold",
  boxShadow: "gold",
  display: "inline-flex",
  flexShrink: 0,
});
const headingStyle = css({
  fontFamily: "display",
  fontSize: "2xl",
  md: { fontSize: "3xl" },
  fontWeight: "semibold",
  color: "fg.default",
});
const subheadingStyle = css({
  color: "fg.muted",
  marginTop: "1",
  fontSize: "sm",
});
const scrollerStyle = css({
  display: "flex",
  gap: "4",
  md: { gap: "6" },
  overflowX: "auto",
  paddingBottom: "4",
  scrollSnapType: "x mandatory",
  scrollbarWidth: "none",
  "&::-webkit-scrollbar": { display: "none" },
});

export function HighlightsSection({
  highlights,
  title = "LavIndia Highlights",
  subtitle = "Where we have shown, shared and been celebrated",
}: {
  highlights: HighlightView[];
  title?: string;
  subtitle?: string;
}) {
  const [current, setCurrent] = useState<HighlightView | null>(null);

  if (highlights.length === 0) return null;

  return (
    <section className={sectionStyle}>
      <div className={containerStyle}>
        <div className={headerStyle}>
          <span className={badgeStyle}>
            <Award className={css({ height: "6", width: "6" })} />
          </span>
          <div>
            <h2 className={headingStyle}>{title}</h2>
            <p className={subheadingStyle}>{subtitle}</p>
          </div>
        </div>

        <div className={scrollerStyle}>
          {highlights.map((highlight) => (
            <HighlightCard key={highlight.id} highlight={highlight} onOpen={setCurrent} />
          ))}
        </div>
      </div>

      <HighlightLightbox highlights={highlights} current={current} onChange={setCurrent} />
    </section>
  );
}
