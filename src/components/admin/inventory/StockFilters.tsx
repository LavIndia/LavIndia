"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";
import { css } from "styled-system/css";
import type { StockStatus } from "@/modules/inventory";

export interface StockFilterValues {
  search: string;
  status: StockStatus | "ALL";
  locationId: string;
}

const rowStyle = css({
  display: "flex",
  flexDirection: { base: "column", md: "row" },
  gap: "3",
  alignItems: { base: "stretch", md: "center" },
});

const searchWrapStyle = css({ position: "relative", flex: "1", minWidth: "0" });
const searchIconStyle = css({
  position: "absolute",
  left: "3",
  top: "50%",
  transform: "translateY(-50%)",
  height: "4",
  width: "4",
  color: "fg.muted",
  pointerEvents: "none",
});
const searchInputStyle = css({ paddingLeft: "9" });
const selectStyle = css({ width: { base: "full", md: "13rem" } });

const STATUS_OPTIONS: { value: StockStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "All stock" },
  { value: "IN_STOCK", label: "In stock" },
  { value: "LOW_STOCK", label: "Low stock" },
  { value: "OUT_OF_STOCK", label: "Out of stock" },
];

/**
 * Search, status and location filters for the stock screen.
 *
 * Search is debounced and pushed into the URL, so a filtered view is a real
 * address an owner can bookmark or send to someone — and a scanned barcode
 * lands on its row without any extra step.
 */
export function StockFilters({
  values,
  locations,
  onChange,
}: {
  values: StockFilterValues;
  locations: { locationId: string; name: string }[];
  onChange: (next: Partial<StockFilterValues>) => void;
}) {
  const [search, setSearch] = useState(values.search);

  // Keeps the box in step when the URL changes from elsewhere (back button,
  // a cleared filter) without fighting the user mid-keystroke.
  useEffect(() => setSearch(values.search), [values.search]);

  useEffect(() => {
    if (search === values.search) return;
    const timer = setTimeout(() => onChange({ search }), 300);
    return () => clearTimeout(timer);
  }, [search, values.search, onChange]);

  return (
    <div className={rowStyle}>
      <div className={searchWrapStyle}>
        <Search className={searchIconStyle} />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search product, SKU or scan a barcode"
          className={searchInputStyle}
          aria-label="Search stock"
        />
      </div>

      <Select
        value={values.status}
        onValueChange={(status) => onChange({ status: status as StockStatus | "ALL" })}
      >
        <SelectTrigger className={selectStyle} aria-label="Filter by stock status">
          <SelectValue placeholder="All stock" />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* With a single location there is nothing to choose between, so the
          control is left out rather than shown with one option. */}
      {locations.length > 1 && (
        <Select
          value={values.locationId || locations[0].locationId}
          onValueChange={(locationId) => onChange({ locationId })}
        >
          <SelectTrigger className={selectStyle} aria-label="Filter by location">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {locations.map((location) => (
              <SelectItem key={location.locationId} value={location.locationId}>
                {location.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
