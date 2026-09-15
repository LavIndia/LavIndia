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
      <div className="min-h-screen bg-white">
        <HeaderSection />
        <main className="py-8">
          <div className="container mx-auto px-4">
            <Skeleton className="h-8 w-64 mb-4" />
            <Skeleton className="h-4 w-96 mb-8" />
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="space-y-4">
                  <Skeleton className="h-64 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
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
      <div className="min-h-screen bg-white">
        <HeaderSection />
        <main className="py-8">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-3xl font-bold mb-4">Category Not Found</h1>
            <p className="text-gray-600">
              The category you&apos;re looking for doesn&apos;t exist.
            </p>
          </div>
        </main>
        <FooterSection />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <HeaderSection />
      <main className="py-8">
        <div className="container mx-auto px-4">
          <div className="mb-6">
            <BreadcrumbNavigation />
          </div>

          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2 capitalize">
              {category.name}
            </h1>
            {category.description && (
              <p className="text-gray-600">{category.description}</p>
            )}
          </div>

          {/* Sorting */}
          <div className="mb-8 flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-gray-500" />
              <span className="font-medium text-gray-700">Sort by:</span>
            </div>

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
          {products.length > 0 ? (
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
            <div className="text-center py-16">
              <p className="text-xl text-gray-600">
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
