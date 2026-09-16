"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { HeaderSection } from "@/components/layout/HeaderSection";
import { FooterSection } from "@/components/layout/FooterSection";
import { BreadcrumbNavigation } from "@/components/layout/BreadcrumbNavigation";
import { ProductCard } from "@/components/ProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Filter } from "lucide-react";
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
  category: { name: string };
}

const pageStyle = css({ minHeight: "100vh", background: "bg.canvas" });

const containerStyle = css({
  maxWidth: "7xl",
  marginInline: "auto",
  paddingInline: "4",
});

const titleStyle = css({
  fontFamily: "display",
  fontSize: { base: "3xl", md: "4xl" },
  fontWeight: "bold",
  color: "fg.default",
  marginBottom: "2",
});

const subtitleStyle = css({ color: "fg.muted" });

const filterRowStyle = css({
  marginBlock: "8",
  display: "flex",
  alignItems: "center",
  gap: "4",
  flexWrap: "wrap",
});

const filterLabelStyle = css({
  display: "flex",
  alignItems: "center",
  gap: "2",
  fontWeight: "medium",
  color: "fg.default",
});

const resultsCountStyle = css({ fontSize: "sm", color: "fg.muted", marginBottom: "6" });

const gridStyle = css({
  display: "grid",
  gridTemplateColumns: { base: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)", lg: "repeat(4, 1fr)" },
  gap: "6",
});

const emptyStateStyle = css({ textAlign: "center", paddingBlock: "16" });

function BudgetShopContent() {
  const searchParams = useSearchParams();
  const maxPriceCents = parseInt(searchParams.get("max") || "0");
  const maxPrice = maxPriceCents / 100;

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [categories, setCategories] = useState<
    Array<{ id: string; name: string }>
  >([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        let url = `/api/products?maxPrice=${maxPriceCents}&sort=${sortBy}`;
        if (selectedCategory !== "all") {
          url += `&categoryId=${selectedCategory}`;
        }

        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          setProducts(data.products || []);
        }
      } catch (error) {
        console.error("Failed to fetch products:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [maxPriceCents, selectedCategory, sortBy]);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/products/categories");
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    }
  };

  return (
    <div className={pageStyle}>
      <HeaderSection />
      <main className={css({ paddingBlock: "8" })}>
        <div className={containerStyle}>
          <div className={css({ marginBottom: "6" })}>
            <BreadcrumbNavigation />
          </div>

          <div className={css({ marginBottom: "8" })}>
            <h1 className={titleStyle}>Shop Under ₹{maxPrice}</h1>
            <p className={subtitleStyle}>Beautiful jewelry within your budget</p>
          </div>

          {/* Filters */}
          <div className={filterRowStyle}>
            <div className={filterLabelStyle}>
              <Filter className={css({ height: "5", width: "5", color: "fg.muted" })} />
              <span>Filter by:</span>
            </div>

            <Select
              value={selectedCategory}
              onValueChange={setSelectedCategory}
            >
              <SelectTrigger className={css({ width: "48" })}>
                <SelectValue placeholder="All Collections" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Collections</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className={css({ width: "48" })}>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="createdAt">Newest First</SelectItem>
                <SelectItem value="priceCents-asc">
                  Price: Low to High
                </SelectItem>
                <SelectItem value="priceCents-desc">
                  Price: High to Low
                </SelectItem>
                <SelectItem value="name">Name: A to Z</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Products Grid */}
          {loading ? (
            <div className={gridStyle}>
              {[...Array(8)].map((_, i) => (
                <div key={i} className={css({ display: "flex", flexDirection: "column", gap: "4" })}>
                  <Skeleton className={css({ height: "64", width: "full" })} />
                  <Skeleton className={css({ height: "4", width: "75%" })} />
                  <Skeleton className={css({ height: "4", width: "50%" })} />
                </div>
              ))}
            </div>
          ) : products.length > 0 ? (
            <>
              <p className={resultsCountStyle}>
                Showing {products.length}{" "}
                {products.length === 1 ? "product" : "products"}
              </p>
              <div className={gridStyle}>
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
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
                ))}
              </div>
            </>
          ) : (
            <div className={emptyStateStyle}>
              <p className={css({ color: "fg.muted", fontSize: "lg" })}>
                No products found in this price range
              </p>
              <p className={css({ color: "fg.muted", opacity: 0.8, marginTop: "2" })}>
                Try adjusting your filters or browse other collections
              </p>
            </div>
          )}
        </div>
      </main>
      <FooterSection />
    </div>
  );
}

export default function BudgetShopPage() {
  return (
    <Suspense
      fallback={
        <div className={pageStyle}>
          <HeaderSection />
          <main className={css({ paddingBlock: "8" })}>
            <div className={containerStyle}>
              <Skeleton className={css({ height: "12", width: "64", marginBottom: "8" })} />
              <div className={gridStyle}>
                {[...Array(8)].map((_, i) => (
                  <Skeleton key={i} className={css({ height: "80", width: "full" })} />
                ))}
              </div>
            </div>
          </main>
        </div>
      }
    >
      <BudgetShopContent />
    </Suspense>
  );
}
