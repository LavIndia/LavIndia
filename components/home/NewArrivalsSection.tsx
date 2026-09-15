"use client";

import { useEffect, useRef } from "react";
import { ProductCard } from "@/components/ProductCard";
import { ChevronRight, Sparkles } from "lucide-react";
import Link from "next/link";

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

export function NewArrivalsSection({ products }: { products: Product[] }) {
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
    <section className="py-16 bg-gradient-to-br from-purple-50 via-pink-50 to-amber-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-900">
                You Blink, You Miss
              </h2>
              <p className="text-gray-600 mt-1">
                Latest additions to our collection
              </p>
            </div>
          </div>
          <Link
            href="/new-arrivals"
            className="text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1 group"
          >
            View All
            <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {products.length > 0 ? (
          <div className="relative">
            <div
              ref={scrollContainerRef}
              className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide"
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
              {products.map((product) => (
                <div key={product.id} className="flex-shrink-0 w-64 snap-start">
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
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">No new arrivals at the moment</p>
          </div>
        )}
      </div>
    </section>
  );
}
