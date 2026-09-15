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
    <div className="min-h-screen bg-white">
      <HeaderSection />
      <main className="py-8">
        <div className="container mx-auto px-4">
          <div className="mb-6">
            <BreadcrumbNavigation />
          </div>

          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Shop Under ₹{maxPrice}
            </h1>
            <p className="text-gray-600">
              Beautiful jewelry within your budget
            </p>
          </div>

          {/* Filters */}
          <div className="mb-8 flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-gray-500" />
              <span className="font-medium text-gray-700">Filter by:</span>
            </div>

            <Select
              value={selectedCategory}
              onValueChange={setSelectedCategory}
            >
              <SelectTrigger className="w-48">
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
              <SelectTrigger className="w-48">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="space-y-4">
                  <Skeleton className="h-64 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          ) : products.length > 0 ? (
            <>
              <p className="text-sm text-gray-600 mb-6">
                Showing {products.length}{" "}
                {products.length === 1 ? "product" : "products"}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
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
            <div className="text-center py-16">
              <p className="text-gray-500 text-lg">
                No products found in this price range
              </p>
              <p className="text-gray-400 mt-2">
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
        <div className="min-h-screen bg-white">
          <HeaderSection />
          <main className="py-8">
            <div className="container mx-auto px-4">
              <Skeleton className="h-12 w-64 mb-8" />
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {[...Array(8)].map((_, i) => (
                  <Skeleton key={i} className="h-80 w-full" />
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
