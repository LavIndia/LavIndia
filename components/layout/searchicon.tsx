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
import colors from "@/styles/colors";
import { designSystem } from "@/styles/design-system";

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
    return `?${(cents / 100).toLocaleString("en-IN")}`;
  };

  const handleProductClick = () => {
    setIsSearchOpen(false);
    setSearchQuery("");
    setResults([]);
  };

  return (
    <Sheet open={isSearchOpen} onOpenChange={setIsSearchOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Search className="h-4 w-4" />
          <span className="sr-only">Search</span>
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-[480px] sm:w-[600px] lg:w-[720px] overflow-y-auto"
      >
        <SheetHeader>
          <SheetTitle>Search Products</SheetTitle>
          <SheetDescription>
            Search for jewelry, collections, and more.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-8">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search for earrings, necklaces, rings..."
              className={`pl-12 pr-4 py-3 ${designSystem.fontSize.xl} ${designSystem.borderRadius.xl} border-2 border-gray-200 focus:border-[${colors.accentGold}] focus:ring-2 focus:ring-[${colors.accentGold}]/20 ${designSystem.componentHeight.lg}`}
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {loading && (
              <Loader2 className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}
          </div>

          {searchQuery.trim().length >= 2 && (
            <div className="mt-6 space-y-4">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                  <p>Searching...</p>
                </div>
              ) : results.length > 0 ? (
                <>
                  <p className="text-sm text-muted-foreground font-medium">
                    Found {results.length}{" "}
                    {results.length === 1 ? "product" : "products"}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto pr-2">
                    {results.map((product) => (
                      <Link
                        key={product.id}
                        href={`/product/${product.id}`}
                        onClick={handleProductClick}
                        className="group"
                      >
                        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-xl hover:border-amber-500 transition-all duration-300">
                          <div className="relative w-full h-48 bg-gray-100 overflow-hidden">
                            {product.images[0] ? (
                              <Image
                                src={product.images[0].url}
                                alt={product.images[0].alt || product.name}
                                fill
                                className="object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                No image
                              </div>
                            )}
                            {product.compareAtCents && (
                              <Badge className="absolute top-2 left-2 bg-red-500 text-white">
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
                          <div className="p-4">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-amber-600 transition-colors">
                                {product.name}
                              </h3>
                              <Badge
                                variant="outline"
                                className="text-xs shrink-0"
                              >
                                {product.category.name}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-900">
                                {formatPrice(product.priceCents)}
                              </span>
                              {product.compareAtCents && (
                                <span className="text-sm text-gray-500 line-through">
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
                <div className="text-center py-12">
                  <Search className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">No products found</p>
                  <p className="text-sm text-gray-400 mt-1">
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
