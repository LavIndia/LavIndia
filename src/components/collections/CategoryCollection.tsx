"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { FilterPanel } from "@/components/collections/facets/FilterPanel";
import {
  activeFilterCount,
  buildFacets,
  priceBoundsOf,
} from "@/components/collections/facets/facet-model";
import { css } from "styled-system/css";

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  compareAtPrice: number | null;
  stock: number;
  sku: string | null;
  material: string | null;
  isFeatured: boolean;
  isLimitedEdition: boolean;
  isNewArrival: boolean;
  isBestSeller: boolean;
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

interface CategoryCollectionProps {
  categorySlug: string;
  categoryName: string;
  categoryDescription: string | null;
  initialProducts: Product[];
  initialPagination: PaginationInfo;
  initialFilters: DynamicFilter[];
}

const heroStyle = css({
  background: "linear-gradient(135deg, {colors.ivory.100}, {colors.ivory.200})",
  borderBottom: "1px solid",
  borderColor: "border.subtle",
});

const heroInnerStyle = css({
  maxWidth: "7xl",
  marginInline: "auto",
  paddingInline: "4",
  paddingBlock: "8",
});

const heroTitleStyle = css({
  fontFamily: "display",
  fontSize: { base: "3xl", md: "5xl" },
  fontWeight: "bold",
  color: "fg.default",
  marginBottom: "4",
  textAlign: "center",
  textTransform: "capitalize",
});

const heroSubtitleStyle = css({
  fontSize: "lg",
  color: "fg.muted",
  maxWidth: "2xl",
  marginInline: "auto",
  textAlign: "center",
});

const containerStyle = css({
  maxWidth: "7xl",
  marginInline: "auto",
  paddingInline: "4",
  paddingBlock: "8",
});

const layoutStyle = css({
  display: "flex",
  flexDirection: "column",
  gap: "6",
  lg: { flexDirection: "row", gap: "8", alignItems: "flex-start" },
});

const desktopPanelWrapStyle = css({
  display: { base: "none", lg: "block" },
  width: "80",
  flexShrink: 0,
});

const panelStyle = css({
  borderRadius: "xl",
  border: "1px solid",
  borderColor: "border.glass",
  background: "bg.glass",
  backdropBlur: "glass",
  boxShadow: "glass",
  padding: "6",
  position: "sticky",
  top: "24",
});

const mobileTriggerWrapStyle = css({ display: { base: "block", lg: "none" }, marginBottom: "4" });

const activeFiltersStyle = css({ marginBottom: "4", display: "flex", flexWrap: "wrap", gap: "2" });

const badgeContentStyle = css({ display: "inline-flex", alignItems: "center", gap: "1" });

const toolbarStyle = css({
  marginBottom: "4",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "3",
  flexWrap: "wrap",
});

const resultsCountStyle = css({ fontSize: "sm", color: "fg.muted" });

const gridStyle = css({
  display: "grid",
  gridTemplateColumns: { base: "1fr", md: "repeat(2, 1fr)", xl: "repeat(3, 1fr)" },
  gap: "6",
});

const skeletonCardStyle = css({
  borderRadius: "lg",
  border: "1px solid",
  borderColor: "border.subtle",
  background: "bg.surface",
  overflow: "hidden",
});

const emptyStateStyle = css({ textAlign: "center", paddingBlock: "12" });

const loadingMoreStyle = css({ display: "flex", justifyContent: "center", paddingBlock: "8" });

const spinnerStyle = css({
  height: "8",
  width: "8",
  borderRadius: "full",
  background: "linear-gradient(135deg, {colors.gold.300}, {colors.gold.500})",
  animation: "pulse",
});

const SORT_OPTIONS = [
  { value: "createdAt", label: "Newest First" },
  { value: "priceCents-asc", label: "Price: Low to High" },
  { value: "priceCents-desc", label: "Price: High to Low" },
  { value: "name", label: "Name: A to Z" },
];

export function CategoryCollection({
  categorySlug,
  categoryName,
  categoryDescription,
  initialProducts,
  initialPagination,
  initialFilters,
}: CategoryCollectionProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pagination, setPagination] = useState<PaginationInfo | null>(
    initialPagination
  );
  const [filters, setFilters] = useState<Filters>({ applied: {} });
  const [sortBy, setSortBy] = useState("createdAt");

  // The slider spans what the unfiltered listing actually costs, and the
  // facets count what is loaded — neither needs another request.
  const bounds = useMemo(() => priceBoundsOf(initialProducts), [initialProducts]);
  // Facets describe the collection, not the current results: they are built
  // from the unfiltered listing the server rendered, so applying "50 cm"
  // narrows the products but never takes "40 cm" away as a choice. A value
  // no product in the collection carries is hidden once that listing is
  // known to be complete, and dimmed until then.
  const facets = useMemo(
    () =>
      buildFacets(initialFilters, initialProducts, {
        complete: initialProducts.length >= initialPagination.totalCount,
      }),
    [initialFilters, initialProducts, initialPagination.totalCount],
  );

  // Filter states
  const [priceRange, setPriceRange] = useState<[number, number]>([bounds.min, bounds.max]);
  const [selectedAttrs, setSelectedAttrs] = useState<string[]>([]);

  // Refs to prevent infinite loops
  const isFetchingRef = useRef(false);
  const currentPageRef = useRef(1);
  const isFirstRender = useRef(true);
  const fetchProductsRef = useRef<
    ((page?: number, append?: boolean) => Promise<void>) | null
  >(null);

  // State to track filter/sort changes
  const [filterChangeTrigger, setFilterChangeTrigger] = useState(0);

  const apiSort = sortBy.startsWith("priceCents") ? "price" : sortBy;
  const apiOrder = sortBy.endsWith("-asc") ? "asc" : "desc";

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
          category: categorySlug,
          sort: apiSort,
          order: apiOrder,
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
        currentPageRef.current = page;
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        setLoading(false);
        setLoadingMore(false);
        isFetchingRef.current = false;
      }
    },
    [filters.applied, categorySlug, apiSort, apiOrder]
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

  // Apply filters. The slider at its ends is not a filter, so only a
  // narrowed range is sent — otherwise every apply would pin a chip to
  // "Min: ₹100" and count as a choice the shopper never made.
  const applyFilters = () => {
    const newFilters: Filters = {
      applied: {
        priceMin: priceRange[0] > bounds.min ? priceRange[0] : undefined,
        priceMax: priceRange[1] < bounds.max ? priceRange[1] : undefined,
        attrValues: selectedAttrs.length > 0 ? selectedAttrs : undefined,
      },
    };
    setFilters(newFilters);
    setFilterChangeTrigger((prev) => prev + 1);
  };

  // Clear filters
  const clearFilters = () => {
    setPriceRange([bounds.min, bounds.max]);
    setSelectedAttrs([]);
    setFilters({ applied: {} });
    setFilterChangeTrigger((prev) => prev + 1);
  };

  const activeCount = activeFilterCount(filters.applied, bounds);
  const hasPendingChanges =
    (filters.applied.priceMin ?? bounds.min) !== priceRange[0] ||
    (filters.applied.priceMax ?? bounds.max) !== priceRange[1] ||
    [...selectedAttrs].sort().join("|") !==
      [...(filters.applied.attrValues ?? [])].sort().join("|");

  // Refetch when filters or sort change (skip the very first run —
  // initial data already arrived server-rendered via props)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterChangeTrigger, sortBy]);

  const toggleAttr = (value: string, checked: boolean) => {
    if (checked) {
      setSelectedAttrs((prev) => [...prev, value]);
    } else {
      setSelectedAttrs((prev) => prev.filter((v) => v !== value));
    }
  };

  const SortSelect = (
    <Select value={sortBy} onValueChange={setSortBy}>
      <SelectTrigger className={css({ width: "48" })}>
        <SelectValue placeholder="Sort by" />
      </SelectTrigger>
      <SelectContent>
        {SORT_OPTIONS.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <div className={css({ minHeight: "100vh", background: "bg.canvas" })}>
      {/* Hero Section */}
      <div className={heroStyle}>
        <div className={heroInnerStyle}>
          <div className={css({ marginBottom: "4" })}>
            <BreadcrumbNavigation />
          </div>
          <div>
            <h1 className={heroTitleStyle}>{categoryName} Collection</h1>
            <p className={heroSubtitleStyle}>
              {categoryDescription ||
                `Discover our exquisite collection of handcrafted ${categoryName.toLowerCase()}, each piece telling a story of tradition and elegance.`}
            </p>
          </div>
        </div>
      </div>

      <div className={containerStyle}>
        <div className={layoutStyle}>
          {/* Filters Sidebar (desktop) */}
          <div className={desktopPanelWrapStyle}>
            <div className={panelStyle}>
              <FilterPanel
                facets={facets}
                bounds={bounds}
                priceRange={priceRange}
                onPriceChange={setPriceRange}
                selected={selectedAttrs}
                onToggle={toggleAttr}
                activeCount={activeCount}
                hasPendingChanges={hasPendingChanges}
                onApply={applyFilters}
                onClear={clearFilters}
              />
            </div>
          </div>

          {/* Products Grid */}
          <div className={css({ flex: "1" })}>
            {/* Mobile Filter Button */}
            <div className={mobileTriggerWrapStyle}>
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" className={css({ width: "full" })}>
                    <Filter className={css({ width: "4", height: "4" })} />
                    Filters{activeCount > 0 ? ` (${activeCount})` : ""}
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom">
                  <SheetHeader>
                    <SheetTitle>Filters</SheetTitle>
                  </SheetHeader>
                  <div className={css({ marginTop: "2" })}>
                    <FilterPanel
                      facets={facets}
                      bounds={bounds}
                      priceRange={priceRange}
                      onPriceChange={setPriceRange}
                      selected={selectedAttrs}
                      onToggle={toggleAttr}
                      activeCount={activeCount}
                      hasPendingChanges={hasPendingChanges}
                      onApply={applyFilters}
                      onClear={clearFilters}
                      showTitle={false}
                    />
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            {/* Active Filters */}
            {(filters.applied.priceMin ||
              filters.applied.priceMax ||
              (filters.applied.attrValues && filters.applied.attrValues.length > 0)) && (
              <div className={activeFiltersStyle}>
                {filters.applied.priceMin && (
                  <Badge variant="secondary">
                    <span className={badgeContentStyle}>
                      Min: ₹{filters.applied.priceMin.toLocaleString()}
                      <X
                        className={css({ width: "3", height: "3", cursor: "pointer" })}
                        onClick={() => {
                          const newFilters = { ...filters };
                          delete newFilters.applied.priceMin;
                          setFilters(newFilters);
                        }}
                      />
                    </span>
                  </Badge>
                )}
                {filters.applied.priceMax && (
                  <Badge variant="secondary">
                    <span className={badgeContentStyle}>
                      Max: ₹{filters.applied.priceMax.toLocaleString()}
                      <X
                        className={css({ width: "3", height: "3", cursor: "pointer" })}
                        onClick={() => {
                          const newFilters = { ...filters };
                          delete newFilters.applied.priceMax;
                          setFilters(newFilters);
                        }}
                      />
                    </span>
                  </Badge>
                )}
                {filters.applied.attrValues?.map((value) => (
                  <Badge key={value} variant="secondary">
                    <span className={badgeContentStyle}>
                      {value}
                      <X
                        className={css({ width: "3", height: "3", cursor: "pointer" })}
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
                    </span>
                  </Badge>
                ))}
              </div>
            )}

            {/* Results count + Sort */}
            <div className={toolbarStyle}>
              {pagination ? (
                <span className={resultsCountStyle}>
                  Showing {products.length} of {pagination.totalCount} products
                </span>
              ) : (
                <span className={resultsCountStyle} />
              )}
              {SortSelect}
            </div>

            {/* Loading Skeleton */}
            {loading && (
              <div className={gridStyle}>
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className={skeletonCardStyle}>
                    <Skeleton className={css({ width: "full", height: "64" })} />
                    <div className={css({ padding: "4" })}>
                      <Skeleton className={css({ height: "4", width: "75%", marginBottom: "2" })} />
                      <Skeleton className={css({ height: "4", width: "50%" })} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Products Grid */}
            {!loading && products.length > 0 && (
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
                    images={product.images}
                    isFeatured={product.isFeatured}
                    isLimitedEdition={product.isLimitedEdition}
                    isNewArrival={product.isNewArrival}
                    isBestSeller={product.isBestSeller}
                    stock={product.stock}
                    variants={product.variants}
                  />
                ))}
              </div>
            )}

            {/* No Products */}
            {!loading && products.length === 0 && (
              <div className={emptyStateStyle}>
                <p className={css({ color: "fg.muted" })}>
                  No products found in {categoryName}.
                </p>
                <Button onClick={clearFilters} className={css({ marginTop: "4" })}>
                  Clear Filters
                </Button>
              </div>
            )}

            {/* Loading More */}
            {loadingMore && (
              <div className={loadingMoreStyle}>
                <div className={spinnerStyle} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
