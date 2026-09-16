import Link from "next/link";
import { DollarSign, TrendingDown } from "lucide-react";
import { css } from "styled-system/css";

type BudgetTier = {
  id: string;
  title: string;
  maxPrice: number;
  gradient: string | null;
  icon: string | null;
  order: number;
  isActive: boolean;
};

const sectionStyle = css({ paddingY: "12", md: { paddingY: "16" }, background: "bg.canvas" });
const containerStyle = css({ marginX: "auto", paddingX: "4", maxWidth: "8xl" });
const headerStyle = css({ textAlign: "center", marginBottom: "8", md: { marginBottom: "10" } });
const headerTopStyle = css({ display: "inline-flex", alignItems: "center", gap: "2", marginBottom: "4" });
const iconBadgeStyle = css({
  padding: "3",
  borderRadius: "full",
  background: "success",
  color: "white",
  display: "inline-flex",
});
const headingStyle = css({ fontFamily: "display", fontSize: "2xl", md: { fontSize: "3xl" }, fontWeight: "semibold", color: "fg.default" });
const subheadingStyle = css({ color: "fg.muted" });

const gridStyle = css({
  display: "grid",
  gridTemplateColumns: "1fr",
  sm: { gridTemplateColumns: "repeat(2, 1fr)" },
  lg: { gridTemplateColumns: "repeat(4, 1fr)" },
  gap: "5",
  maxWidth: "6xl",
  marginX: "auto",
});

const tileStyle = css({
  position: "relative",
  background: "bg.surface",
  padding: "7",
  borderRadius: "xl",
  border: "1px solid",
  borderColor: "border.subtle",
  overflow: "hidden",
  transition: "box-shadow 0.3s ease, border-color 0.3s ease",
  "&:hover": { borderColor: "accent.default", boxShadow: "glassLg" },
});

const glowOverlayStyle = css({
  position: "absolute",
  inset: "0",
  opacity: "0",
  transition: "opacity 0.3s ease",
  ".group:hover &": { opacity: "0.08" },
});

const contentStyle = css({ position: "relative", zIndex: "10", textAlign: "center" });

const iconWrapStyle = css({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "16",
  height: "16",
  borderRadius: "full",
  marginBottom: "4",
  transition: "transform 0.3s ease",
  ".group:hover &": { transform: "scale(1.1)" },
});

const tierTitleStyle = css({ fontFamily: "display", fontSize: "xl", fontWeight: "semibold", color: "fg.default", marginBottom: "2" });

const ctaStyle = css({
  marginTop: "4",
  display: "inline-flex",
  alignItems: "center",
  gap: "2",
  fontSize: "sm",
  fontWeight: "medium",
  color: "fg.muted",
  transition: "color 0.2s ease",
  ".group:hover &": { color: "accent.pressed" },
  "& span:last-child": {
    transition: "transform 0.2s ease",
    ".group:hover &": { transform: "translateX(3px)" },
  },
});

const DEFAULT_GRADIENT = "linear-gradient(to bottom right, #10b981, #059669)";

export function ShopUnderBudgetSection({
  tiers,
  title = "Shop Under Budget",
}: {
  tiers: BudgetTier[];
  title?: string;
}) {
  if (tiers.length === 0) {
    return null;
  }

  return (
    <section className={sectionStyle}>
      <div className={containerStyle}>
        <div className={headerStyle}>
          <div className={headerTopStyle}>
            <div className={iconBadgeStyle}>
              <TrendingDown className={css({ height: "6", width: "6" })} />
            </div>
            <h2 className={headingStyle}>{title}</h2>
          </div>
          <p className={subheadingStyle}>Beautiful jewelry for every budget</p>
        </div>

        <div className={gridStyle}>
          {tiers.map((tier) => (
            <Link key={tier.id} href={`/shop/budget?max=${tier.maxPrice}`} className="group">
              <div className={tileStyle}>
                <div
                  className={glowOverlayStyle}
                  style={{ background: tier.gradient || DEFAULT_GRADIENT }}
                />

                <div className={contentStyle}>
                  <div
                    className={iconWrapStyle}
                    style={{ background: tier.gradient || DEFAULT_GRADIENT }}
                  >
                    <DollarSign className={css({ height: "8", width: "8", color: "white" })} />
                  </div>

                  <h3 className={tierTitleStyle}>{tier.title}</h3>

                  <div className={ctaStyle}>
                    <span>Shop Now</span>
                    <span>→</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
