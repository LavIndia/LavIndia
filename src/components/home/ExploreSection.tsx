import Link from "next/link";
import Image from "next/image";
import { ChevronRight } from "lucide-react";
import { css, cx } from "styled-system/css";

type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  isFeatured: boolean;
  featuredOrder: number;
};

const sectionStyle = css({
  paddingY: "10",
  md: { paddingY: "12" },
  background: "linear-gradient(to bottom, {colors.ivory.50}, {colors.ivory.100})",
});

const containerStyle = css({
  marginX: "auto",
  paddingX: "4",
  maxWidth: "8xl",
});

const headerRowStyle = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: "6",
  md: { marginBottom: "8" },
  gap: "4",
});

const headingStyle = css({
  fontFamily: "display",
  fontSize: "2xl",
  md: { fontSize: "3xl" },
  fontWeight: "semibold",
  color: "fg.default",
});

const viewAllStyle = css({
  display: "inline-flex",
  alignItems: "center",
  gap: "1",
  fontWeight: "medium",
  fontSize: "sm",
  color: "accent.pressed",
  flexShrink: "0",
  "&:hover": { color: "accent.default" },
  "& svg": { transition: "transform 0.18s ease" },
  "&:hover svg": { transform: "translateX(3px)" },
});

const scrollerStyle = css({
  display: "flex",
  gap: "5",
  md: { gap: "6" },
  overflowX: "auto",
  paddingBottom: "4",
  scrollSnapType: "x mandatory",
  scrollbarWidth: "none",
  "&::-webkit-scrollbar": { display: "none" },
});

const tileLinkStyle = css({
  flexShrink: "0",
  scrollSnapAlign: "start",
});

const tileStyle = css({
  position: "relative",
  width: "52",
  height: "64",
  sm: { width: "60", height: "72" },
  md: { width: "64", height: "80" },
  borderRadius: "xl",
  overflow: "hidden",
  border: "1px solid",
  borderColor: "border.subtle",
  boxShadow: "card",
  transition: "box-shadow 0.3s ease, border-color 0.3s ease",
  "&:hover": { borderColor: "accent.default", boxShadow: "glassLg" },
});

const tileImageStyle = css({
  objectFit: "cover",
  transition: "transform 0.5s ease",
  ".group:hover &": { transform: "scale(1.08)" },
});

const tilePlaceholderStyle = css({
  position: "absolute",
  inset: 0,
  background: "linear-gradient(135deg, {colors.gold.50}, {colors.ivory.200})",
});

const overlayStyle = css({
  position: "absolute",
  inset: "0",
  background: "linear-gradient(to top, rgba(18,17,16,0.78), rgba(18,17,16,0.15) 55%, transparent)",
});

const captionStyle = css({
  position: "absolute",
  insetX: "0",
  bottom: "0",
  padding: "5",
});

const tileTitleStyle = css({
  fontFamily: "display",
  fontSize: "xl",
  fontWeight: "semibold",
  color: "ivory.50",
  marginBottom: "1",
  transition: "color 0.2s ease",
  ".group:hover &": { color: "gold.200" },
});

const tileDescStyle = css({
  fontSize: "sm",
  color: "rgba(255,253,248,0.85)",
});

export function ExploreSection({
  categories,
  title = "Explore Collections",
}: {
  categories: Category[];
  title?: string;
}) {
  if (categories.length === 0) {
    return null;
  }

  return (
    <section className={sectionStyle}>
      <div className={containerStyle}>
        <div className={headerRowStyle}>
          <h2 className={headingStyle}>{title}</h2>
          <Link
            href={`/${categories[0]?.slug || "earrings"}`}
            className={viewAllStyle}
          >
            View All
            <ChevronRight className={css({ height: "4", width: "4" })} />
          </Link>
        </div>

        <div className={css({ position: "relative" })}>
          <div className={scrollerStyle}>
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/${category.slug}`}
                className={cx(tileLinkStyle, "group")}
              >
                <div className={tileStyle}>
                  {category.image ? (
                    <Image
                      src={category.image}
                      alt={category.name}
                      fill
                      className={tileImageStyle}
                    />
                  ) : (
                    <div className={tilePlaceholderStyle} />
                  )}
                  <div className={overlayStyle} />
                  <div className={captionStyle}>
                    <h3 className={tileTitleStyle}>{category.name}</h3>
                    <p className={tileDescStyle}>
                      {category.description || "Explore Collection"} →
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
