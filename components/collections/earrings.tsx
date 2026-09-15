"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductCard } from "@/components/ProductCard";
import { BreadcrumbNavigation } from "@/components/layout/BreadcrumbNavigation";

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  compareAtPrice: number | null;
  stock: number;
  sku: string | null;
  isFeatured: boolean;
  images: Array<{
    url: string;
    alt: string;
  }>;
  variants: Array<{
    id: string;
    name: string;
    price: number;
    color: string | null;
    size: string | null;
    material: string | null;
    stock: number;
  }>;
  category: {
    name: string;
    slug: string;
  };
}

interface PaginationInfo {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface Filters {
  applied: {
    priceMin?: number;
    priceMax?: number;
    attrValues?: string[];
  };
}

interface FilterOption {
  id: string;
  label: string;
  value: string;
  color: string | null;
}

interface DynamicFilter {
  id: string;
  name: string;
  slug: string;
  type: "CHECKBOX" | "DROPDOWN" | "RANGE" | "COLOR";
  options: FilterOption[];
}

interface EarringsCollectionProps {
  initialProducts: Product[];
  initialPagination: PaginationInfo;
  initialFilters: DynamicFilter[];
}

export function EarringsCollection({
  initialProducts,
  initialPagination,
  initialFilters,
}: EarringsCollectionProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pagination, setPagination] = useState<PaginationInfo | null>(
    initialPagination
  );
  const [filters, setFilters] = useState<Filters>({ applied: {} });

  // Filter states
  const [priceRange, setPriceRange] = useState<[number, number]>([100, 30000]);
  const [selectedAttrs, setSelectedAttrs] = useState<string[]>([]);
  const [dynamicFilters] = useState<DynamicFilter[]>(initialFilters);

  // Refs to prevent infinite loops
  const isFetchingRef = useRef(false);
  const currentPageRef = useRef(1);
  const isFirstRender = useRef(true);

  // State to track filter changes
  const [filterChangeTrigger, setFilterChangeTrigger] = useState(0);

  const fetchProductsRef = useRef<
    ((page?: number, append?: boolean) => Promise<void>) | null
  >(null);

  const fetchProducts = useCallback(
    async (page = 1, append = false) => {
      if (isFetchingRef.current) return;

      try {
        isFetchingRef.current = true;
        if (page === 1) setLoading(true);
        else setLoadingMore(true);

        const params = new URLSearchParams({
          page: page.toString(),
          limit: "30",
          category: "earrings",
        });

        if (filters.applied.priceMin)
          params.set("price_min", filters.applied.priceMin.toString());
        if (filters.applied.priceMax)
          params.set("price_max", filters.applied.priceMax.toString());
        if (filters.applied.attrValues?.length)
          params.set("attr", filters.applied.attrValues.join(","));

        const response = await fetch(`/api/products?${params}`);
        const data = await response.json();

        if (append) {
          setProducts((prev) => [...prev, ...data.products]);
        } else {
          setProducts(data.products);
        }

        setPagination(data.pagination);
        // Don't update filters from API response to prevent loops
        // setFilters(data.filters);
        currentPageRef.current = page;
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        setLoading(false);
        setLoadingMore(false);
        isFetchingRef.current = false;
      }
    },
    [filters.applied]
  );

  // Update the ref when fetchProducts changes
  useEffect(() => {
    fetchProductsRef.current = fetchProducts;
  }, [fetchProducts]);

  // Load more products (infinite scroll)
  useEffect(() => {
    if (!pagination?.hasNextPage || loading || loadingMore) return;

    const handleScroll = () => {
      if (
        window.innerHeight + window.scrollY >=
          document.body.offsetHeight - 1000 &&
        !isFetchingRef.current &&
        fetchProductsRef.current
      ) {
        fetchProductsRef.current(currentPageRef.current + 1, true);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [pagination?.hasNextPage, loading, loadingMore]);

  // Apply filters
  const applyFilters = () => {
    const newFilters: Filters = {
      applied: {
        priceMin: priceRange[0],
        priceMax: priceRange[1],
        attrValues: selectedAttrs.length > 0 ? selectedAttrs : undefined,
      },
    };
    setFilters(newFilters);
    setFilterChangeTrigger((prev) => prev + 1);
  };

  // Clear filters
  const clearFilters = () => {
    setPriceRange([100, 30000]);
    setSelectedAttrs([]);
    setFilters({ applied: {} });
    setFilterChangeTrigger((prev) => prev + 1);
  };

  // Refetch when filters change (skip the very first run — initial data
  // already arrived server-rendered via props)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (fetchProductsRef.current) {
      setProducts([]);
      setPagination(null);
      currentPageRef.current = 1;
      fetchProductsRef.current(1, false);
    }
  }, [filterChangeTrigger]); // Only trigger on user filter changes

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100">
        <div className="container mx-auto px-4 py-8">
          {/* Breadcrumb */}
          <div className="mb-4">
            <BreadcrumbNavigation />
          </div>

          {/* Title and Description */}
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Earrings Collection
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Discover our exquisite collection of handcrafted earrings, each
              piece telling a story of tradition and elegance.
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="flex gap-8">
          {/* Filters Sidebar */}
          <div className="hidden lg:block w-80 flex-shrink-0">
            <div className="bg-white border border-gray-200 rounded-lg p-6 sticky top-24 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Filters
              </h3>

              {/* Price Range */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-900 mb-3">
                  Price Range (₹)
                </h4>
                <div className="px-2">
                  <Slider
                    value={priceRange}
                    onValueChange={(value) =>
                      setPriceRange(value as [number, number])
                    }
                    max={30000}
                    min={100}
                    step={100}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-gray-600 mt-2">
                    <span>₹{priceRange[0].toLocaleString()}</span>
                    <span>₹{priceRange[1].toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Admin-configured filters */}
              {dynamicFilters.map((filter) => (
                <div key={filter.id} className="mb-6">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">
                    {filter.name}
                  </h4>
                  <div className="space-y-2">
                    {filter.options.map((option) => (
                      <div key={option.id} className="flex items-center">
                        <Checkbox
                          id={option.id}
                          checked={selectedAttrs.includes(option.value)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedAttrs((prev) => [...prev, option.value]);
                            } else {
                              setSelectedAttrs((prev) =>
                                prev.filter((v) => v !== option.value)
                              );
                            }
                          }}
                        />
                        <label
                          htmlFor={option.id}
                          className="ml-2 text-sm text-gray-700"
                        >
                          {option.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Apply Filters */}
              <div className="flex gap-2">
                <Button onClick={applyFilters} className="flex-1">
                  Apply Filters
                </Button>
                <Button variant="outline" onClick={clearFilters}>
                  Clear
                </Button>
              </div>
            </div>
          </div>

          {/* Products Grid */}
          <div className="flex-1">
            {/* Mobile Filter Button */}
            <div className="lg:hidden mb-4">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" className="w-full">
                    <Filter className="w-4 h-4 mr-2" />
                    Filters
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80">
                  <SheetHeader>
                    <SheetTitle>Filters</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6">
                    {/* Price Range */}
                    <div className="mb-6">
                      <h4 className="text-sm font-medium text-gray-900 mb-3">
                        Price Range (₹)
                      </h4>
                      <div className="px-2">
                        <Slider
                          value={priceRange}
                          onValueChange={(value) =>
                            setPriceRange(value as [number, number])
                          }
                          max={30000}
                          min={100}
                          step={100}
                          className="w-full"
                        />
                        <div className="flex justify-between text-sm text-gray-600 mt-2">
                          <span>₹{priceRange[0].toLocaleString()}</span>
                          <span>₹{priceRange[1].toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Admin-configured filters */}
                    {dynamicFilters.map((filter) => (
                      <div key={filter.id} className="mb-6">
                        <h4 className="text-sm font-medium text-gray-900 mb-3">
                          {filter.name}
                        </h4>
                        <div className="space-y-2">
                          {filter.options.map((option) => (
                            <div key={option.id} className="flex items-center">
                              <Checkbox
                                id={`mobile-${option.id}`}
                                checked={selectedAttrs.includes(option.value)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedAttrs((prev) => [...prev, option.value]);
                                  } else {
                                    setSelectedAttrs((prev) =>
                                      prev.filter((v) => v !== option.value)
                                    );
                                  }
                                }}
                              />
                              <label
                                htmlFor={`mobile-${option.id}`}
                                className="ml-2 text-sm text-gray-700"
                              >
                                {option.label}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}

                    {/* Apply Filters */}
                    <div className="flex gap-2">
                      <Button onClick={applyFilters} className="flex-1">
                        Apply Filters
                      </Button>
                      <Button variant="outline" onClick={clearFilters}>
                        Clear
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            {/* Active Filters */}
            {(filters.applied.priceMin ||
              filters.applied.priceMax ||
              (filters.applied.attrValues && filters.applied.attrValues.length > 0)) && (
              <div className="mb-4 flex flex-wrap gap-2">
                {filters.applied.priceMin && (
                  <Badge
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    Min: ₹{filters.applied.priceMin.toLocaleString()}
                    <X
                      className="w-3 h-3 cursor-pointer"
                      onClick={() => {
                        const newFilters = { ...filters };
                        delete newFilters.applied.priceMin;
                        setFilters(newFilters);
                      }}
                    />
                  </Badge>
                )}
                {filters.applied.priceMax && (
                  <Badge
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    Max: ₹{filters.applied.priceMax.toLocaleString()}
                    <X
                      className="w-3 h-3 cursor-pointer"
                      onClick={() => {
                        const newFilters = { ...filters };
                        delete newFilters.applied.priceMax;
                        setFilters(newFilters);
                      }}
                    />
                  </Badge>
                )}
                {filters.applied.attrValues?.map((value) => (
                  <Badge
                    key={value}
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    {value}
                    <X
                      className="w-3 h-3 cursor-pointer"
                      onClick={() => {
                        setSelectedAttrs((prev) => prev.filter((v) => v !== value));
                        setFilters((prev) => ({
                          applied: {
                            ...prev.applied,
                            attrValues: prev.applied.attrValues?.filter(
                              (v) => v !== value
                            ),
                          },
                        }));
                      }}
                    />
                  </Badge>
                ))}
              </div>
            )}

            {/* Products Count */}
            {pagination && (
              <div className="mb-4 text-sm text-gray-600">
                Showing {products.length} of {pagination.totalCount} earrings
              </div>
            )}

            {/* Loading Skeleton */}
            {loading && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div
                    key={i}
                    className="bg-white border border-gray-200 rounded-lg overflow-hidden"
                  >
                    <Skeleton className="w-full h-64" />
                    <div className="p-4">
                      <Skeleton className="h-4 w-3/4 mb-2" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Products Grid */}
            {!loading && products.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    id={product.id}
                    name={product.name}
                    slug={product.slug}
                    description={product.description}
                    price={product.price}
                    compareAtPrice={product.compareAtPrice}
                    images={product.images}
                    isFeatured={product.isFeatured}
                    stock={product.stock}
                    variants={product.variants}
                  />
                ))}
              </div>
            )}

            {/* No Products */}
            {!loading && products.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-600">
                  No earrings found matching your criteria.
                </p>
                <Button onClick={clearFilters} className="mt-4">
                  Clear Filters
                </Button>
              </div>
            )}

            {/* Loading More */}
            {loadingMore && (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
