"use client";

import { useEffect, useRef } from "react";
import { motion } from "motion/react";
import { ProductCard } from "@/components/ProductCard";
import { ChevronRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { css } from "styled-system/css";

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  priceCents: number;
  compareAtCents: number | null;
  stock: number;
  images: Array<{ url: string; alt: string }>;
  isFeatured: boolean;
}

const sectionStyle = css({
  paddingY: "12",
  md: { paddingY: "16" },
  background: "linear-gradient(135deg, rgba(232,199,194,0.35), {colors.ivory.100}, {colors.gold.50})",
});
const containerStyle = css({ marginX: "auto", paddingX: "4", maxWidth: "8xl" });
const headerRowStyle = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: "8",
  md: { marginBottom: "10" },
  gap: "4",
});
const headerLeftStyle = css({ display: "flex", alignItems: "center", gap: "3" });
const iconBadgeStyle = css({
  padding: "3",
  borderRadius: "full",
  background: "linear-gradient(135deg, {colors.gold.300}, {colors.gold.500})",
  color: "fg.onGold",
  boxShadow: "gold",
  display: "inline-flex",
});
const headingStyle = css({ fontFamily: "display", fontSize: "2xl", md: { fontSize: "3xl" }, fontWeight: "semibold", color: "fg.default" });
const subheadingStyle = css({ color: "fg.muted", marginTop: "1", fontSize: "sm" });
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
  scrollbarWidth: "none",
  "&::-webkit-scrollbar": { display: "none" },
});
const cardWrapStyle = css({ flexShrink: "0", width: "56", sm: { width: "64" }, scrollSnapAlign: "start" });
const emptyStyle = css({ textAlign: "center", paddingY: "12", color: "fg.muted" });

export function NewArrivalsSection({
  products,
  title = "You Blink, You Miss",
}: {
  products: Product[];
  title?: string;
}) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const containerWidth = rect.width;
    const edgeThreshold = 100; // pixels from edge to trigger scroll

    // Clear any existing interval
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }

    // Check if mouse is near left edge
    if (x < edgeThreshold) {
      const speed = Math.max(1, (edgeThreshold - x) / 10);
      scrollIntervalRef.current = setInterval(() => {
        container.scrollLeft -= speed;
      }, 16);
    }
    // Check if mouse is near right edge
    else if (x > containerWidth - edgeThreshold) {
      const speed = Math.max(1, (x - (containerWidth - edgeThreshold)) / 10);
      scrollIntervalRef.current = setInterval(() => {
        container.scrollLeft += speed;
      }, 16);
    }
  };

  const handleMouseLeave = () => {
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
      }
    };
  }, []);

  return (
    <section className={sectionStyle}>
      <div className={containerStyle}>
        <div className={headerRowStyle}>
          <div className={headerLeftStyle}>
            <div className={iconBadgeStyle}>
              <Sparkles className={css({ height: "6", width: "6" })} />
            </div>
            <div>
              <h2 className={headingStyle}>{title}</h2>
              <p className={subheadingStyle}>Latest additions to our collection</p>
            </div>
          </div>
          <Link href="/new-arrivals" className={viewAllStyle}>
            View All
            <ChevronRight className={css({ height: "4", width: "4" })} />
          </Link>
        </div>

        {products.length > 0 ? (
          <div className={css({ position: "relative" })}>
            <div
              ref={scrollContainerRef}
              className={scrollerStyle}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
              {products.map((product) => (
                <motion.div
                  key={product.id}
                  className={cardWrapStyle}
                  whileHover={{ y: -6 }}
                  transition={{ type: "spring", stiffness: 300, damping: 22 }}
                >
                  <ProductCard
                    id={product.id}
                    name={product.name}
                    slug={product.slug}
                    description={product.description}
                    price={product.priceCents / 100}
                    compareAtPrice={
                      product.compareAtCents
                        ? product.compareAtCents / 100
                        : null
                    }
                    images={product.images}
                    isFeatured={product.isFeatured}
                    stock={product.stock}
                  />
                </motion.div>
              ))}
            </div>
          </div>
        ) : (
          <div className={emptyStyle}>
            <p>No new arrivals at the moment</p>
          </div>
        )}
      </div>
    </section>
  );
}
