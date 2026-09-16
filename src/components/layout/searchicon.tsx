"use client";

import { useState, useEffect } from "react";
import { Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import Link from "next/link";
import { css } from "styled-system/css";

interface SearchProduct {
  id: string;
  name: string;
  slug: string;
  priceCents: number;
  compareAtCents: number | null;
  images: Array<{
    url: string;
    alt: string | null;
  }>;
  category: {
    name: string;
  };
}

const contentStyle = css({
  width: { base: "100vw", sm: "600px", lg: "720px" },
  maxWidth: "26rem",
  overflowY: "auto",
});

const searchFieldWrapStyle = css({ position: "relative" });
const searchIconStyle = css({
  position: "absolute",
  left: "4",
  top: "50%",
  transform: "translateY(-50%)",
  height: "5",
  width: "5",
  color: "fg.muted",
  pointerEvents: "none",
});
const searchInputStyle = css({
  paddingLeft: "12",
  paddingRight: "4",
  height: "12",
  fontSize: "md",
  borderRadius: "xl",
  borderWidth: "2px",
});
const spinnerRightStyle = css({
  position: "absolute",
  right: "4",
  top: "50%",
  transform: "translateY(-50%)",
  height: "5",
  width: "5",
  color: "fg.muted",
  animation: "spin",
});

const resultsWrapStyle = css({ marginTop: "6", display: "flex", flexDirection: "column", gap: "4" });
const centerStateStyle = css({ textAlign: "center", paddingBlock: "8", color: "fg.muted" });
const countLabelStyle = css({ fontSize: "sm", color: "fg.muted", fontWeight: "medium" });
const resultsGridStyle = css({
  display: "grid",
  gridTemplateColumns: { base: "1fr", sm: "1fr 1fr" },
  gap: "4",
  maxHeight: "70vh",
  overflowY: "auto",
  paddingRight: "2",
});

const cardStyle = css({
  background: "bg.surface",
  border: "1px solid",
  borderColor: "border.subtle",
  borderRadius: "lg",
  overflow: "hidden",
  transition: "box-shadow 0.25s ease, border-color 0.25s ease",
  "&:hover, &[data-hovered]": { boxShadow: "glassLg", borderColor: "accent.default" },
});
const cardImageWrapStyle = css({
  position: "relative",
  width: "full",
  height: "48",
  background: "bg.canvas",
  overflow: "hidden",
});
const cardImageStyle = css({
  objectFit: "cover",
  transition: "transform 0.3s ease",
  ".cardGroup:hover &, .cardGroup[data-hovered] &": { transform: "scale(1.05)" },
});
const noImageStyle = css({
  width: "full",
  height: "full",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "fg.muted",
});
const discountBadgeStyle = css({ position: "absolute", top: "2", left: "2", background: "danger", color: "white" });
const cardBodyStyle = css({ padding: "4" });
const cardTitleRowStyle = css({ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "2", marginBottom: "2" });
const cardTitleStyle = css({
  fontFamily: "body",
  fontWeight: "semibold",
  fontSize: "sm",
  lineClamp: 2,
  transition: "color 0.2s ease",
  ".cardGroup:hover &, .cardGroup[data-hovered] &": { color: "accent.pressed" },
});
const categoryBadgeStyle = css({ fontSize: "xs", flexShrink: 0 });
const priceRowStyle = css({ display: "flex", alignItems: "center", gap: "2" });
const priceStyle = css({ fontFamily: "display", fontWeight: "bold", color: "fg.default" });
const compareAtStyle = css({ fontSize: "sm", color: "fg.muted", textDecoration: "line-through" });
const emptyStateStyle = css({ textAlign: "center", paddingBlock: "12" });
const emptyIconStyle = css({ height: "12", width: "12", color: "border.subtle", marginInline: "auto", marginBottom: "3" });
const emptyTitleStyle = css({ color: "fg.muted", fontWeight: "medium" });
const emptySubtitleStyle = css({ fontSize: "sm", color: "fg.muted", marginTop: "1" });

export function SearchIcon() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<SearchProduct[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const searchProducts = async () => {
      if (searchQuery.trim().length < 2) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        const res = await fetch(
          `/api/products?search=${encodeURIComponent(searchQuery)}`
        );
        if (res.ok) {
          const data = await res.json();
          setResults(data.products || []);
        }
      } catch (error) {
        console.error("Search failed:", error);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(searchProducts, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  const formatPrice = (cents: number) => {
    return `₹${(cents / 100).toLocaleString("en-IN")}`;
  };

  const handleProductClick = () => {
    setIsSearchOpen(false);
    setSearchQuery("");
    setResults([]);
  };

  return (
    <Sheet open={isSearchOpen} onOpenChange={setIsSearchOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon">
          <Search className={css({ height: "4", width: "4" })} />
          <span className={css({ srOnly: true })}>Search</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className={contentStyle}>
        <SheetHeader>
          <SheetTitle>Search Products</SheetTitle>
          <SheetDescription>
            Search for jewelry, collections, and more.
          </SheetDescription>
        </SheetHeader>
        <div>
          <div className={searchFieldWrapStyle}>
            <Search className={searchIconStyle} aria-hidden />
            <Input
              placeholder="Search for earrings, necklaces, rings..."
              className={searchInputStyle}
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {loading && <Loader2 className={spinnerRightStyle} aria-hidden />}
          </div>

          {searchQuery.trim().length >= 2 && (
            <div className={resultsWrapStyle}>
              {loading ? (
                <div className={centerStateStyle}>
                  <Loader2 className={css({ height: "8", width: "8", animation: "spin", marginInline: "auto", marginBottom: "2" })} />
                  <p>Searching...</p>
                </div>
              ) : results.length > 0 ? (
                <>
                  <p className={countLabelStyle}>
                    Found {results.length}{" "}
                    {results.length === 1 ? "product" : "products"}
                  </p>
                  <div className={resultsGridStyle}>
                    {results.map((product) => (
                      <Link
                        key={product.id}
                        href={`/product/${product.id}`}
                        onClick={handleProductClick}
                        className="cardGroup"
                      >
                        <div className={cardStyle}>
                          <div className={cardImageWrapStyle}>
                            {product.images[0] ? (
                              <Image
                                src={product.images[0].url}
                                alt={product.images[0].alt || product.name}
                                fill
                                className={cardImageStyle}
                              />
                            ) : (
                              <div className={noImageStyle}>No image</div>
                            )}
                            {product.compareAtCents && (
                              <Badge className={discountBadgeStyle}>
                                {Math.round(
                                  ((product.compareAtCents -
                                    product.priceCents) /
                                    product.compareAtCents) *
                                    100
                                )}
                                % OFF
                              </Badge>
                            )}
                          </div>
                          <div className={cardBodyStyle}>
                            <div className={cardTitleRowStyle}>
                              <h3 className={cardTitleStyle}>{product.name}</h3>
                              <Badge variant="outline" className={categoryBadgeStyle}>
                                {product.category.name}
                              </Badge>
                            </div>
                            <div className={priceRowStyle}>
                              <span className={priceStyle}>
                                {formatPrice(product.priceCents)}
                              </span>
                              {product.compareAtCents && (
                                <span className={compareAtStyle}>
                                  {formatPrice(product.compareAtCents)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </>
              ) : (
                <div className={emptyStateStyle}>
                  <Search className={emptyIconStyle} />
                  <p className={emptyTitleStyle}>No products found</p>
                  <p className={emptySubtitleStyle}>
                    Try different keywords or browse our collections
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
