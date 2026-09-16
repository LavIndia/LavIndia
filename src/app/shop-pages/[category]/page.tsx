"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
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
  price: number;
  compareAtPrice: number | null;
  stock: number;
  images: Array<{ url: string; alt: string }>;
  isFeatured: boolean;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

const pageStyle = css({ minHeight: "100vh", background: "bg.canvas" });

const containerStyle = css({
  maxWidth: "7xl",
  marginInline: "auto",
  paddingInline: "4",
});

const gridStyle = css({
  display: "grid",
  gridTemplateColumns: { base: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)", lg: "repeat(4, 1fr)" },
  gap: "6",
});

export default function DynamicCategoryPage() {
  const params = useParams();
  const categorySlug = params.category as string;

  const [products, setProducts] = useState<Product[]>([]);
  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<string>("createdAt");

  const apiSort = sortBy.startsWith("priceCents") ? "price" : sortBy;
  const apiOrder = sortBy.endsWith("-asc") ? "asc" : "desc";

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch category details
        const categoryRes = await fetch(`/api/categories?slug=${categorySlug}`);
        if (categoryRes.ok) {
          const categoryData = await categoryRes.json();
          if (categoryData.category) {
            setCategory(categoryData.category);

            // Fetch products for this category
            const productsRes = await fetch(
              `/api/products?category=${categorySlug}&sort=${apiSort}&order=${apiOrder}`
            );
            if (productsRes.ok) {
              const productsData = await productsRes.json();
              setProducts(productsData.products || []);
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [apiOrder, apiSort, categorySlug, sortBy]);

  if (loading) {
    return (
      <div className={pageStyle}>
        <HeaderSection />
        <main className={css({ paddingBlock: "8" })}>
          <div className={containerStyle}>
            <Skeleton className={css({ height: "8", width: "64", marginBottom: "4" })} />
            <Skeleton className={css({ height: "4", width: "96", marginBottom: "8" })} />
            <div className={gridStyle}>
              {[...Array(8)].map((_, i) => (
                <div key={i} className={css({ display: "flex", flexDirection: "column", gap: "4" })}>
                  <Skeleton className={css({ height: "64", width: "full" })} />
                  <Skeleton className={css({ height: "4", width: "75%" })} />
                  <Skeleton className={css({ height: "4", width: "50%" })} />
                </div>
              ))}
            </div>
          </div>
        </main>
        <FooterSection />
      </div>
    );
  }

  if (!category) {
    return (
      <div className={pageStyle}>
        <HeaderSection />
        <main className={css({ paddingBlock: "8" })}>
          <div className={css({ maxWidth: "7xl", marginInline: "auto", paddingInline: "4", textAlign: "center" })}>
            <h1 className={css({ fontFamily: "display", fontSize: "3xl", fontWeight: "bold", marginBottom: "4", color: "fg.default" })}>
              Category Not Found
            </h1>
            <p className={css({ color: "fg.muted" })}>
              The category you&apos;re looking for doesn&apos;t exist.
            </p>
          </div>
        </main>
        <FooterSection />
      </div>
    );
  }

  return (
    <div className={pageStyle}>
      <HeaderSection />
      <main className={css({ paddingBlock: "8" })}>
        <div className={containerStyle}>
          <div className={css({ marginBottom: "6" })}>
            <BreadcrumbNavigation />
          </div>

          <div className={css({ marginBottom: "8" })}>
            <h1 className={css({ fontFamily: "display", fontSize: { base: "3xl", md: "4xl" }, fontWeight: "bold", color: "fg.default", marginBottom: "2", textTransform: "capitalize" })}>
              {category.name}
            </h1>
            {category.description && (
              <p className={css({ color: "fg.muted" })}>{category.description}</p>
            )}
          </div>

          {/* Sorting */}
          <div className={css({ marginBottom: "8", display: "flex", alignItems: "center", gap: "4", flexWrap: "wrap" })}>
            <div className={css({ display: "flex", alignItems: "center", gap: "2", fontWeight: "medium", color: "fg.default" })}>
              <Filter className={css({ height: "5", width: "5", color: "fg.muted" })} />
              <span>Sort by:</span>
            </div>

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
          {products.length > 0 ? (
            <>
              <p className={css({ fontSize: "sm", color: "fg.muted", marginBottom: "6" })}>
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
                    price={product.price}
                    compareAtPrice={product.compareAtPrice}
                    images={product.images.map((img) => ({
                      url: img.url,
                      alt: img.alt || product.name,
                    }))}
                    isFeatured={product.isFeatured}
                    stock={product.stock}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className={css({ textAlign: "center", paddingBlock: "16" })}>
              <p className={css({ fontSize: "xl", color: "fg.muted" })}>
                No products found in this category.
              </p>
            </div>
          )}
        </div>
      </main>
      <FooterSection />
    </div>
  );
}
