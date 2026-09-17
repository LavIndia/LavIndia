"use client";

import { useState, useEffect } from "react";
import { ProductCard } from "@/components/ProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import { HeaderSection } from "@/components/layout/HeaderSection";
import { FooterSection } from "@/components/layout/FooterSection";
import TopPromoBanner from "@/components/home/TopPromoBanner";
import { Sparkles, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  isLimitedEdition: boolean;
  isNewArrival: boolean;
  category?: {
    name: string;
    slug: string;
  };
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

const heroStyle = css({
  background: "linear-gradient(135deg, {colors.onyx.800}, {colors.onyx.900})",
  color: "fg.onGold",
  paddingBlock: { base: "8", md: "12" },
});

const heroInnerStyle = css({
  maxWidth: "7xl",
  marginInline: "auto",
  paddingInline: "4",
});

const heroIconWrapStyle = css({
  display: "inline-flex",
  padding: "3",
  borderRadius: "full",
  background: "linear-gradient(135deg, {colors.gold.300}, {colors.gold.500})",
});

const heroTitleRowStyle = css({
  display: "flex",
  alignItems: "center",
  gap: "3",
  marginBottom: "3",
});

const heroTitleStyle = css({
  fontFamily: "display",
  fontSize: { base: "3xl", md: "4xl" },
  fontWeight: "bold",
});

const heroSubtitleStyle = css({
  fontSize: { base: "md", md: "lg" },
  color: "rgba(255,255,255,0.85)",
});

const containerStyle = css({
  maxWidth: "7xl",
  marginInline: "auto",
  paddingInline: "4",
  paddingBlock: "8",
});

const filterBarStyle = css({
  borderRadius: "xl",
  border: "1px solid",
  borderColor: "border.glass",
  background: "bg.glass",
  backdropBlur: "glass",
  boxShadow: "glass",
  padding: "4",
  marginBottom: "8",
});

const filterBarHeaderStyle = css({
  display: "flex",
  alignItems: "center",
  gap: "2",
  marginBottom: "4",
});

const filterBarTitleStyle = css({
  fontFamily: "body",
  fontWeight: "semibold",
  color: "fg.default",
});

const filterGridStyle = css({
  display: "grid",
  gridTemplateColumns: { base: "1fr", md: "1fr 1fr" },
  gap: "4",
});

const fieldLabelStyle = css({
  display: "block",
  fontSize: "sm",
  fontWeight: "medium",
  color: "fg.muted",
  marginBottom: "2",
});

const resultsCountStyle = css({
  marginTop: "4",
  fontSize: "sm",
  color: "fg.muted",
});

const gridStyle = css({
  display: "grid",
  gridTemplateColumns: { base: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)", lg: "repeat(4, 1fr)" },
  gap: "6",
});

const emptyStateStyle = css({
  textAlign: "center",
  paddingBlock: "16",
});

const emptyTextStyle = css({
  color: "fg.muted",
  fontSize: "lg",
});

export default function NewArrivalsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("default");

  useEffect(() => {
    fetchCategories();
    fetchProducts();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/categories");
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/products/new-arrivals");
      if (response.ok) {
        const data = await response.json();
        setProducts(data.products || []);
      }
    } catch (error) {
      console.error("Failed to fetch new arrivals:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort products
  const filteredProducts = products
    .filter((product) => {
      if (selectedCategory === "all") return true;
      return product.category?.slug === selectedCategory;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "price-low":
          return a.priceCents - b.priceCents;
        case "price-high":
          return b.priceCents - a.priceCents;
        case "name":
          return a.name.localeCompare(b.name);
        default:
          return 0; // Keep original order (newest first)
      }
    });

  return (
    <div className={css({ minHeight: "100vh", background: "bg.canvas" })}>
      <TopPromoBanner />
      <HeaderSection />

      {/* Header */}
      <div className={heroStyle}>
        <div className={heroInnerStyle}>
          <div className={heroTitleRowStyle}>
            <div className={heroIconWrapStyle}>
              <Sparkles className={css({ height: "8", width: "8", color: "fg.onGold" })} />
            </div>
            <h1 className={heroTitleStyle}>New Arrivals</h1>
          </div>
          <p className={heroSubtitleStyle}>
            Discover our latest jewelry collection
          </p>
        </div>
      </div>

      <div className={containerStyle}>
        {/* Filters */}
        <div className={filterBarStyle}>
          <div className={filterBarHeaderStyle}>
            <SlidersHorizontal className={css({ height: "5", width: "5", color: "fg.muted" })} />
            <h2 className={filterBarTitleStyle}>Filter &amp; Sort</h2>
          </div>

          <div className={filterGridStyle}>
            {/* Category Filter */}
            <div>
              <label className={fieldLabelStyle}>Category</label>
              <Select
                value={selectedCategory}
                onValueChange={setSelectedCategory}
              >
                <SelectTrigger suppressHydrationWarning className={css({ width: "full" })}>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.slug}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sort By */}
            <div>
              <label className={fieldLabelStyle}>Sort By</label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger suppressHydrationWarning className={css({ width: "full" })}>
                  <SelectValue placeholder="Newest First" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Newest First</SelectItem>
                  <SelectItem value="price-low">Price: Low to High</SelectItem>
                  <SelectItem value="price-high">Price: High to Low</SelectItem>
                  <SelectItem value="name">Name: A to Z</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Results Count */}
          <div className={resultsCountStyle}>
            Showing {filteredProducts.length} product
            {filteredProducts.length !== 1 ? "s" : ""}
          </div>
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className={gridStyle}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className={css({ display: "flex", flexDirection: "column", gap: "3" })}>
                <Skeleton className={css({ height: "64", width: "full", borderRadius: "lg" })} />
                <Skeleton className={css({ height: "4", width: "75%" })} />
                <Skeleton className={css({ height: "4", width: "50%" })} />
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className={emptyStateStyle}>
            <p className={emptyTextStyle}>No products found</p>
            <Button
              variant="outline"
              className={css({ marginTop: "4" })}
              onClick={() => {
                setSelectedCategory("all");
                setSortBy("default");
              }}
            >
              Clear Filters
            </Button>
          </div>
        ) : (
          <div className={gridStyle}>
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                id={product.id}
                name={product.name}
                slug={product.slug}
                price={product.priceCents / 100}
                compareAtPrice={
                  product.compareAtCents ? product.compareAtCents / 100 : null
                }
                images={product.images}
                isFeatured={product.isFeatured}
                isLimitedEdition={product.isLimitedEdition}
                isNewArrival={product.isNewArrival}
                stock={product.stock}
              />
            ))}
          </div>
        )}
      </div>

      <FooterSection />
    </div>
  );
}
