"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Layers, Search, SlidersHorizontal } from "lucide-react";
import { css } from "styled-system/css";

/**
 * Searching, narrowing and sorting the product list.
 *
 * On a wide screen every control sits on one row, as it always has. On a
 * phone only the search box and two small buttons are shown, and the rest
 * folds away behind the second of them: stacked full-width, the toolbar ran
 * to about two thirds of the screen before a single product appeared, which
 * made the list unusable on the device an owner is most likely to glance at
 * it from.
 *
 * The folded panel is hidden with CSS rather than left unrendered, so that
 * the same markup serves both layouts and the selects keep their state when
 * the screen is rotated or resized.
 */

const cardStyle = css({
  display: "flex",
  flexDirection: "column",
  gap: "3",
  borderRadius: "xl",
  border: "1px solid",
  borderColor: "border.subtle",
  background: "bg.surface",
  padding: "3",
  md: { flexDirection: "row", alignItems: "center" },
});
const searchRowStyle = css({
  display: "flex",
  alignItems: "center",
  gap: "2",
  minWidth: 0,
  flex: "1",
});
const searchWrapStyle = css({ position: "relative", minWidth: 0, flex: "1" });
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
/** The two compact buttons that replace the full toolbar on a phone. */
const phoneOnlyStyle = css({ display: { base: "inline-flex", md: "none" }, flexShrink: 0 });
const iconStyle = css({ height: "4", width: "4" });
const selectPairStyle = css({
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "2",
  md: { display: "contents" },
});
const buttonPairStyle = css({
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "2",
  md: { display: "contents" },
});

export interface ProductsFilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  onSubmit: () => void;
  category: string;
  onCategoryChange: (value: string) => void;
  sort: string;
  onSortChange: (value: string) => void;
  grouped: boolean;
  onToggleGrouped: () => void;
  categories: Array<{ id: string; name: string }>;
}

export function ProductsFilterBar({
  search,
  onSearchChange,
  onSubmit,
  category,
  onCategoryChange,
  sort,
  onSortChange,
  grouped,
  onToggleGrouped,
  categories,
}: ProductsFilterBarProps) {
  const [showFilters, setShowFilters] = useState(false);

  // Shown from `md` whatever the toggle says; on a phone it follows it.
  const panelStyle = css({
    display: showFilters ? "flex" : "none",
    flexDirection: "column",
    gap: "2",
    md: { display: "contents" },
  });

  return (
    <div className={cardStyle}>
      <div className={searchRowStyle}>
        <div className={searchWrapStyle}>
          <Search className={searchIconStyle} />
          <Input
            placeholder="Search products..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSubmit()}
            className={css({ paddingLeft: "9" })}
          />
        </div>
        <Button size="icon" onClick={onSubmit} className={phoneOnlyStyle} aria-label="Search">
          <Search className={iconStyle} />
        </Button>
        <Button
          variant={showFilters ? "default" : "outline"}
          size="icon"
          onClick={() => setShowFilters((open) => !open)}
          className={phoneOnlyStyle}
          aria-label="Filters and sorting"
          aria-expanded={showFilters}
        >
          <SlidersHorizontal className={iconStyle} />
        </Button>
      </div>

      <div className={panelStyle}>
        <div className={selectPairStyle}>
          <Select value={category} onValueChange={onCategoryChange}>
            <SelectTrigger className={css({ width: "full", md: { width: "52" } })}>
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sort} onValueChange={onSortChange}>
            <SelectTrigger className={css({ width: "full", md: { width: "44" } })}>
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="createdAt">Newest First</SelectItem>
              <SelectItem value="name_asc">Name (A-Z)</SelectItem>
              <SelectItem value="name_desc">Name (Z-A)</SelectItem>
              <SelectItem value="price_asc">Price (Low-High)</SelectItem>
              <SelectItem value="price_desc">Price (High-Low)</SelectItem>
              <SelectItem value="stock_asc">Stock (Low-High)</SelectItem>
              <SelectItem value="stock_desc">Stock (High-Low)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className={buttonPairStyle}>
          {/* The wide layout keeps its own Search button; on a phone the
              magnifier beside the box already does this job. */}
          <Button
            onClick={onSubmit}
            className={css({ display: { base: "none", md: "inline-flex" } })}
          >
            Search
          </Button>
          <Button
            variant={grouped ? "default" : "outline"}
            onClick={onToggleGrouped}
            className={css({
              width: "full",
              gridColumn: { base: "span 2", md: "auto" },
              md: { width: "auto" },
            })}
          >
            <Layers className={iconStyle} />
            Group by category
          </Button>
        </div>
      </div>
    </div>
  );
}
