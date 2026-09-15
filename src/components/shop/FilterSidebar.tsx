"use client";

import { useEffect, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

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

  if (loading) {
    return (
      <div className="space-y-4 w-full">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (filters.length === 0) {
    return null;
  }

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Filters</h3>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={handleClearAll}>
            Clear all
          </Button>
        )}
      </div>

      {filters.map((filter) => (
        <div key={filter.id} className="border-t pt-4">
          <h4 className="font-medium text-gray-800 mb-3">{filter.name}</h4>
          <div className="space-y-2">
            {filter.type === "RANGE"
              ? filter.options.map((option) => (
                  <div key={option.id} className="flex items-center gap-2">
                    <Checkbox
                      id={option.id}
                      checked={selectedRange === option.value}
                      onCheckedChange={() => handleRangeSelect(option.value)}
                    />
                    <Label htmlFor={option.id} className="cursor-pointer font-normal">
                      {option.label}
                    </Label>
                  </div>
                ))
              : filter.options.map((option) => (
                  <div key={option.id} className="flex items-center gap-2">
                    <Checkbox
                      id={option.id}
                      checked={selectedAttrs.includes(option.value)}
                      onCheckedChange={(checked) =>
                        handleAttrToggle(option.value, checked as boolean)
                      }
                    />
                    {filter.type === "COLOR" && option.color && (
                      <span
                        className="w-4 h-4 rounded-full border border-gray-300 inline-block"
                        style={{ backgroundColor: option.color }}
                      />
                    )}
                    <Label htmlFor={option.id} className="cursor-pointer font-normal">
                      {option.label}
                    </Label>
                  </div>
                ))}
          </div>
        </div>
      ))}
    </div>
  );
}
