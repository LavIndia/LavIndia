"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { css, cx } from "styled-system/css";
import {
  DATE_PRESETS,
  EMPTY_FILTERS,
  ORDER_CHANNELS,
  ORDER_STATUSES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  filtersToQuery,
  hasActiveFilters,
  type OrderFilters,
} from "@/modules/orders/order-filters";
import type { CategoryOption } from "./order-types";

const barStyle = css({
  display: "flex",
  flexDirection: "column",
  gap: "3",
  borderRadius: "xl",
  border: "1px solid",
  borderColor: "border.subtle",
  background: "bg.surface",
  padding: "3",
  boxShadow: "card",
});
const rowStyle = css({
  display: "flex",
  flexDirection: "column",
  gap: "3",
  lg: { flexDirection: "row", alignItems: "center" },
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
const selectStyle = css({ width: "full", lg: { width: "48" } });
/** The secondary filters, revealed rather than always on screen. */
const moreGridStyle = css({
  display: "grid",
  gap: "3",
  gridTemplateColumns: { base: "1fr", md: "repeat(2, 1fr)", xl: "repeat(4, 1fr)" },
  paddingTop: "3",
  borderTop: "1px solid",
  borderColor: "border.subtle",
});
const fieldStyle = css({ display: "flex", flexDirection: "column", gap: "1.5", minWidth: 0 });
const labelStyle = css({ fontSize: "xs", fontWeight: "medium", color: "fg.muted" });
const amountRowStyle = css({ display: "flex", alignItems: "center", gap: "2" });
const amountInputStyle = css({ minWidth: 0, fontVariantNumeric: "tabular-nums" });
const toStyle = css({ fontSize: "sm", color: "fg.muted" });
const iconStyle = css({ height: "4", width: "4" });
const hintStyle = css({ fontSize: "xs", color: "fg.muted" });

/**
 * How the Orders list is narrowed.
 *
 * The three questions asked constantly — which channel, over what period, and
 * find this one order — stay on the surface; everything else sits behind
 * "More filters", so the screen opens calm and expands only when needed.
 *
 * Filters are held locally and applied on demand rather than navigating on
 * every keystroke: the list is a server query, and re-running it per character
 * would be both slow and a great many database calls for nothing.
 */
export function OrdersFilters({
  initial,
  categories,
}: {
  initial: OrderFilters;
  categories: CategoryOption[];
}) {
  const router = useRouter();
  const [filters, setFilters] = useState<OrderFilters>(initial);
  const [showMore, setShowMore] = useState(
    // Opened already when something inside it is active, so an applied filter
    // is never hidden from the person looking at the results.
    initial.status !== "all" ||
      initial.paymentStatus !== "all" ||
      initial.paymentMethod !== "all" ||
      initial.categoryId !== "all" ||
      Boolean(initial.minAmount) ||
      Boolean(initial.maxAmount),
  );

  const set = <K extends keyof OrderFilters>(key: K, value: OrderFilters[K]) =>
    setFilters((current) => ({ ...current, [key]: value }));

  const apply = (next: OrderFilters = filters) => {
    const query = filtersToQuery(next);
    router.push(query ? `/admin/orders?${query}` : "/admin/orders");
  };

  /** Channel and period are applied immediately — they are a single tap. */
  const applyNow = <K extends keyof OrderFilters>(key: K, value: OrderFilters[K]) => {
    const next = { ...filters, [key]: value };
    setFilters(next);
    apply(next);
  };

  const clear = () => {
    setFilters(EMPTY_FILTERS);
    router.push("/admin/orders");
  };

  return (
    <div className={barStyle}>
      <div className={rowStyle}>
        <div className={searchWrapStyle}>
          <Search className={searchIconStyle} />
          <Input
            placeholder="Order number, invoice number, customer name, mobile or email"
            value={filters.search}
            onChange={(event) => set("search", event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && apply()}
            className={css({ paddingLeft: "9" })}
            aria-label="Search orders"
          />
        </div>

        <Select value={filters.channel} onValueChange={(value) => applyNow("channel", value)}>
          <SelectTrigger className={selectStyle} aria-label="Channel">
            <SelectValue placeholder="Channel" />
          </SelectTrigger>
          <SelectContent>
            {ORDER_CHANNELS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.datePreset}
          onValueChange={(value) => applyNow("datePreset", value)}
        >
          <SelectTrigger className={selectStyle} aria-label="Period">
            <SelectValue placeholder="Period" />
          </SelectTrigger>
          <SelectContent>
            {DATE_PRESETS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          onClick={() => setShowMore((open) => !open)}
          className={css({ width: "full", lg: { width: "auto" } })}
        >
          <SlidersHorizontal className={iconStyle} />
          {showMore ? "Fewer filters" : "More filters"}
        </Button>

        <Button onClick={() => apply()} className={css({ width: "full", lg: { width: "auto" } })}>
          Apply
        </Button>

        {hasActiveFilters(filters) && (
          <Button
            variant="ghost"
            onClick={clear}
            className={css({ width: "full", lg: { width: "auto" } })}
          >
            <X className={iconStyle} />
            Clear
          </Button>
        )}
      </div>

      {showMore && (
        <div className={moreGridStyle}>
          <label className={fieldStyle}>
            <span className={labelStyle}>Stage</span>
            <Select value={filters.status} onValueChange={(value) => set("status", value)}>
              <SelectTrigger aria-label="Order stage">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ORDER_STATUSES.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>

          <label className={fieldStyle}>
            <span className={labelStyle}>Payment</span>
            <Select
              value={filters.paymentStatus}
              onValueChange={(value) => set("paymentStatus", value)}
            >
              <SelectTrigger aria-label="Payment state">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_STATUSES.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>

          <label className={fieldStyle}>
            <span className={labelStyle}>Paid by</span>
            <Select
              value={filters.paymentMethod}
              onValueChange={(value) => set("paymentMethod", value)}
            >
              <SelectTrigger aria-label="Payment method">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>

          <label className={fieldStyle}>
            <span className={labelStyle}>Category</span>
            <Select
              value={filters.categoryId}
              onValueChange={(value) => set("categoryId", value)}
            >
              <SelectTrigger aria-label="Category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any category</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>

          <div className={cx(fieldStyle, css({ xl: { gridColumn: "span 2" } }))}>
            <span className={labelStyle}>Order value (₹)</span>
            <div className={amountRowStyle}>
              <Input
                type="number"
                min={0}
                inputMode="numeric"
                placeholder="From"
                value={filters.minAmount}
                onChange={(event) => set("minAmount", event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && apply()}
                className={amountInputStyle}
                aria-label="Minimum order value in rupees"
              />
              <span className={toStyle}>to</span>
              <Input
                type="number"
                min={0}
                inputMode="numeric"
                placeholder="To"
                value={filters.maxAmount}
                onChange={(event) => set("maxAmount", event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && apply()}
                className={amountInputStyle}
                aria-label="Maximum order value in rupees"
              />
            </div>
            <span className={hintStyle}>
              Compares the value of the items, before shipping and tax.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
