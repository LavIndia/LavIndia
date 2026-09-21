"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import type { RecommendedProduct } from "@/modules/catalog/client";
import { css } from "styled-system/css";

/**
 * One titled, horizontally scrolling row of product cards.
 *
 * Purely presentational and strategy-agnostic: it is given a heading, a line
 * of context and some products, and knows nothing about where they came
 * from. The homepage rails, the recommendation rails on a product page and
 * anything later added to the cart or the order-confirmation screen can all
 * be this component with different props, which is the whole point of
 * separating it from the service that chooses the products.
 */

const sectionStyle = css({ paddingY: "10", md: { paddingY: "12" } });
const containerStyle = css({ marginX: "auto", paddingX: "4", maxWidth: "8xl" });
const headerRowStyle = css({
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "space-between",
  gap: "4",
  marginBottom: "6",
});
const headingStyle = css({
  fontFamily: "display",
  fontSize: "xl",
  md: { fontSize: "2xl" },
  fontWeight: "semibold",
  color: "fg.default",
});
const subtitleStyle = css({ fontSize: "sm", color: "fg.muted", marginTop: "1" });
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
  gap: "4",
  md: { gap: "6" },
  overflowX: "auto",
  paddingBottom: "4",
  scrollSnapType: "x mandatory",
  scrollbarWidth: "none",
  "&::-webkit-scrollbar": { display: "none" },
});
const cardWrapStyle = css({
  flexShrink: "0",
  width: "10.5rem",
  sm: { width: "56" },
  md: { width: "64" },
  scrollSnapAlign: "start",
});

export interface ProductRailProps {
  title: string;
  subtitle?: string;
  products: RecommendedProduct[];
  /** Shows a "View All" link beside the heading when given. */
  viewAllHref?: string;
  className?: string;
}

export function ProductRail({
  title,
  subtitle,
  products,
  viewAllHref,
  className,
}: ProductRailProps) {
  // An empty rail renders nothing at all rather than a heading over a blank
  // strip; callers are free to pass whatever they have.
  if (products.length === 0) return null;

  return (
    <section className={className ?? sectionStyle}>
      <div className={containerStyle}>
        <div className={headerRowStyle}>
          <div>
            <h2 className={headingStyle}>{title}</h2>
            {subtitle && <p className={subtitleStyle}>{subtitle}</p>}
          </div>
          {viewAllHref && (
            <Link href={viewAllHref} className={viewAllStyle}>
              View All
              <ChevronRight className={css({ height: "4", width: "4" })} />
            </Link>
          )}
        </div>

        <div className={scrollerStyle}>
          {products.map((product) => (
            <div key={product.id} className={cardWrapStyle}>
              <ProductCard
                id={product.id}
                name={product.name}
                slug={product.slug}
                description={product.description}
                price={product.priceCents / 100}
                compareAtPrice={
                  product.compareAtCents ? product.compareAtCents / 100 : null
                }
                images={product.images}
                isFeatured={product.isFeatured}
                isLimitedEdition={product.isLimitedEdition}
                stock={product.stock}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
