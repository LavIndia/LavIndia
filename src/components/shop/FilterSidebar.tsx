"use client";

import { useEffect, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { css } from "styled-system/css";

interface FilterOption {
  id: string;
  label: string;
  value: string;
  color: string | null;
}

interface FilterData {
  id: string;
  name: string;
  slug: string;
  type: "CHECKBOX" | "DROPDOWN" | "RANGE" | "COLOR";
  options: FilterOption[];
}

export interface AppliedFilters {
  priceMin?: number;
  priceMax?: number;
  attrValues: string[];
}

const panelStyle = css({
  display: "flex",
  flexDirection: "column",
  gap: "6",
  width: "full",
  borderRadius: "xl",
  border: "1px solid",
  borderColor: "border.glass",
  background: "bg.glass",
  backdropBlur: "glass",
  boxShadow: "glass",
  padding: "6",
});

const sectionStyle = css({
  display: "flex",
  flexDirection: "column",
  gap: "3",
  borderTop: "1px solid",
  borderColor: "border.subtle",
  paddingTop: "4",
  "&:first-of-type": { borderTop: "none", paddingTop: "0" },
});

const sectionHeadingStyle = css({
  fontFamily: "body",
  fontSize: "sm",
  fontWeight: "semibold",
  color: "fg.default",
});

const swatchStyle = css({
  display: "inline-block",
  width: "4",
  height: "4",
  borderRadius: "full",
  border: "1px solid",
  borderColor: "border.subtle",
  flexShrink: 0,
});

function FilterOptions({ filters, selectedRange, selectedAttrs, onRangeSelect, onAttrToggle }: {
  filters: FilterData[];
  selectedRange: string | null;
  selectedAttrs: string[];
  onRangeSelect: (value: string) => void;
  onAttrToggle: (value: string, checked: boolean) => void;
}) {
  return (
    <>
      {filters.map((filter) => (
        <div key={filter.id} className={sectionStyle}>
          <h4 className={sectionHeadingStyle}>{filter.name}</h4>
          <div className={css({ display: "flex", flexDirection: "column", gap: "2" })}>
            {filter.type === "RANGE"
              ? filter.options.map((option) => (
                  <Checkbox
                    key={option.id}
                    checked={selectedRange === option.value}
                    onCheckedChange={() => onRangeSelect(option.value)}
                  >
                    {option.label}
                  </Checkbox>
                ))
              : filter.options.map((option) => (
                  <Checkbox
                    key={option.id}
                    checked={selectedAttrs.includes(option.value)}
                    onCheckedChange={(checked) => onAttrToggle(option.value, checked)}
                  >
                    <span className={css({ display: "inline-flex", alignItems: "center", gap: "2" })}>
                      {filter.type === "COLOR" && option.color && (
                        <span className={swatchStyle} style={{ backgroundColor: option.color }} />
                      )}
                      {option.label}
                    </span>
                  </Checkbox>
                ))}
          </div>
        </div>
      ))}
    </>
  );
}

export function FilterSidebar({
  categorySlug,
  onChange,
}: {
  categorySlug: string;
  onChange: (filters: AppliedFilters) => void;
}) {
  const [filters, setFilters] = useState<FilterData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRange, setSelectedRange] = useState<string | null>(null);
  const [selectedAttrs, setSelectedAttrs] = useState<string[]>([]);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/filters?category=${categorySlug}`)
      .then((res) => res.json())
      .then((data) => setFilters(data.filters || []))
      .catch(() => setFilters([]))
      .finally(() => setLoading(false));
    // Reset selections when category changes
    setSelectedRange(null);
    setSelectedAttrs([]);
  }, [categorySlug]);

  const applyFilters = (range: string | null, attrs: string[]) => {
    let priceMin: number | undefined;
    let priceMax: number | undefined;

    if (range) {
      const [min, max] = range.split("-").map((n) => parseInt(n, 10));
      priceMin = isNaN(min) ? undefined : min;
      priceMax = isNaN(max) ? undefined : max;
    }

    onChange({ priceMin, priceMax, attrValues: attrs });
  };

  const handleRangeSelect = (value: string) => {
    const next = selectedRange === value ? null : value;
    setSelectedRange(next);
    applyFilters(next, selectedAttrs);
  };

  const handleAttrToggle = (value: string, checked: boolean) => {
    const next = checked
      ? [...selectedAttrs, value]
      : selectedAttrs.filter((v) => v !== value);
    setSelectedAttrs(next);
    applyFilters(selectedRange, next);
  };

  const handleClearAll = () => {
    setSelectedRange(null);
    setSelectedAttrs([]);
    applyFilters(null, []);
  };

  const hasActiveFilters = selectedRange !== null || selectedAttrs.length > 0;
  const activeCount = (selectedRange ? 1 : 0) + selectedAttrs.length;

  if (loading) {
    return (
      <div className={css({ display: "flex", flexDirection: "column", gap: "4", width: "full" })}>
        <Skeleton className={css({ height: "6", width: "32" })} />
        <Skeleton className={css({ height: "24", width: "full" })} />
        <Skeleton className={css({ height: "24", width: "full" })} />
      </div>
    );
  }

  if (filters.length === 0) {
    return null;
  }

  return (
    <>
      {/* Mobile: bottom sheet trigger */}
      <div className={css({ display: { base: "block", lg: "none" }, width: "full" })}>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" className={css({ width: "full" })}>
              <SlidersHorizontal size={16} aria-hidden />
              Filters
              {hasActiveFilters && (
                <span
                  className={css({
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minWidth: "5",
                    height: "5",
                    paddingInline: "1.5",
                    borderRadius: "full",
                    background: "linear-gradient(135deg, {colors.gold.300}, {colors.gold.500})",
                    color: "fg.onGold",
                    fontSize: "xs",
                    fontWeight: "semibold",
                  })}
                >
                  {activeCount}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom">
            <SheetHeader>
              <SheetTitle>Filters</SheetTitle>
            </SheetHeader>
            <div className={css({ display: "flex", flexDirection: "column", gap: "6", marginTop: "2" })}>
              <FilterOptions
                filters={filters}
                selectedRange={selectedRange}
                selectedAttrs={selectedAttrs}
                onRangeSelect={handleRangeSelect}
                onAttrToggle={handleAttrToggle}
              />
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={handleClearAll}>
                  Clear all filters
                </Button>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop: inline glass panel */}
      <div className={css({ display: { base: "none", lg: "block" }, width: "64", flexShrink: 0 })}>
        <div className={css({ position: "sticky", top: "24" })}>
          <div className={panelStyle}>
            <div className={css({ display: "flex", alignItems: "center", justifyContent: "space-between" })}>
              <h3 className={css({ fontFamily: "display", fontSize: "lg", fontWeight: "semibold", color: "fg.default" })}>
                Filters
              </h3>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={handleClearAll}>
                  Clear all
                </Button>
              )}
            </div>
            <FilterOptions
              filters={filters}
              selectedRange={selectedRange}
              selectedAttrs={selectedAttrs}
              onRangeSelect={handleRangeSelect}
              onAttrToggle={handleAttrToggle}
            />
          </div>
        </div>
      </div>
    </>
  );
}
