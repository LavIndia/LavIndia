"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { css } from "styled-system/css";
import {
  EMPTY_CUSTOMER_FILTERS,
  customersQuery,
  hasCustomerFilters,
  type CustomerFilters,
} from "@/modules/customers/customer-filters";
import { CUSTOMER_TIERS, type TierThresholds } from "@/modules/customers/customer-tier";
import { tierRangeLabel } from "./customer-display";

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
  md: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
});
const searchRowStyle = css({ display: "flex", alignItems: "center", gap: "2", minWidth: 0, flex: "1" });
const searchWrapStyle = css({ position: "relative", minWidth: 0, flex: "1", md: { maxWidth: "md" } });
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
const iconStyle = css({ height: "4", width: "4" });
const wideOnlyStyle = css({ display: { base: "none", md: "inline" } });
const chipRowStyle = css({ display: "flex", flexWrap: "wrap", gap: "2" });
const chipStyle = (active: boolean) =>
  css({
    borderRadius: "full",
    border: "1px solid",
    borderColor: active ? "accent.default" : "border.subtle",
    background: active ? "gold.50" : "bg.surface",
    color: "fg.default",
    paddingInline: "3.5",
    paddingBlock: "1.5",
    fontSize: "sm",
    fontWeight: active ? "medium" : "normal",
    cursor: "pointer",
    whiteSpace: "nowrap",
    _dark: { background: active ? "bg.canvas" : "bg.surface" },
    _focusVisible: { outline: "2px solid", outlineColor: "accent.default" },
  });

/**
 * Finding a client: a search over name, email and mobile, and the tier
 * chips. The search runs on the server across every client, applied on Enter
 * or the button rather than per keystroke; a tier is a single tap and
 * applies at once. Either one starts the list again from its first page.
 */
export function CustomersFilters({
  initial,
  thresholds,
}: {
  initial: CustomerFilters;
  thresholds: TierThresholds;
}) {
  const router = useRouter();
  const [q, setQ] = useState(initial.q);

  const go = (next: CustomerFilters) => {
    const query = customersQuery(next);
    router.push(query ? `/admin/customers?${query}` : "/admin/customers");
  };
  const search = () => go({ ...initial, q: q.trim() });
  const clear = () => {
    setQ("");
    go(EMPTY_CUSTOMER_FILTERS);
  };

  return (
    <div className={barStyle}>
      <div className={searchRowStyle}>
        <div className={searchWrapStyle}>
          <Search className={searchIconStyle} />
          <Input
            type="search"
            placeholder="Name, email or mobile"
            value={q}
            onChange={(event) => setQ(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && search()}
            className={css({ paddingLeft: "9" })}
            aria-label="Search clients by name, email or mobile"
            enterKeyHint="search"
          />
        </div>
        <Button onClick={search} aria-label="Search">
          <Search className={iconStyle} />
          <span className={wideOnlyStyle}>Search</span>
        </Button>
        {hasCustomerFilters(initial) && (
          <Button variant="ghost" onClick={clear} aria-label="Clear search and tier">
            <X className={iconStyle} />
            <span className={wideOnlyStyle}>Clear</span>
          </Button>
        )}
      </div>

      <div className={chipRowStyle} role="group" aria-label="Tier">
        {[{ key: "all" as const, label: "All" }, ...CUSTOMER_TIERS].map((tier) => {
          const active = initial.tier === tier.key;
          return (
            <button
              key={tier.key}
              type="button"
              className={chipStyle(active)}
              aria-pressed={active}
              title={tier.key === "all" ? "Every client" : tierRangeLabel(tier.key, thresholds)}
              onClick={() => go({ q: q.trim(), tier: tier.key })}
            >
              {tier.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
