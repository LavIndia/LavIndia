"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PriceFacet } from "@/components/collections/facets/PriceFacet";
import { OptionFacet } from "@/components/collections/facets/OptionFacet";
import type { Facet, PriceBounds } from "@/components/collections/facets/facet-model";
import { css } from "styled-system/css";

/**
 * The whole filter panel, used in the desktop sidebar and the mobile sheet
 * alike so the two can never drift apart.
 *
 * Choices are applied with the button rather than on every tap: each apply
 * is a request, and a shopper ticking three boxes should cost one, not three.
 * The header says how many choices are in force, and Clear is only offered
 * when there is something to clear.
 */

const headerStyle = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "3",
  marginBottom: "4",
});
const titleStyle = css({
  fontFamily: "display",
  fontSize: "lg",
  fontWeight: "semibold",
  color: "fg.default",
});
const actionsStyle = css({ display: "flex", gap: "2" });
const pendingStyle = css({ fontSize: "xs", color: "fg.muted", marginTop: "2" });

export interface FilterPanelProps {
  facets: Facet[];
  bounds: PriceBounds;
  priceRange: [number, number];
  onPriceChange: (value: [number, number]) => void;
  selected: string[];
  onToggle: (value: string, checked: boolean) => void;
  activeCount: number;
  /** True when the panel's choices differ from what is applied. */
  hasPendingChanges: boolean;
  onApply: () => void;
  onClear: () => void;
  /** Rendered inside the panel title, e.g. to omit it in a sheet that has its own. */
  showTitle?: boolean;
}

export function FilterPanel({
  facets,
  bounds,
  priceRange,
  onPriceChange,
  selected,
  onToggle,
  activeCount,
  hasPendingChanges,
  onApply,
  onClear,
  showTitle = true,
}: FilterPanelProps) {
  return (
    <div>
      {showTitle ? (
        <div className={headerStyle}>
          <h3 className={titleStyle}>Filters</h3>
          {activeCount > 0 ? <Badge>{activeCount} active</Badge> : null}
        </div>
      ) : null}

      <PriceFacet bounds={bounds} range={priceRange} onChange={onPriceChange} />

      {facets.map((facet) => (
        <OptionFacet key={facet.id} facet={facet} selected={selected} onToggle={onToggle} />
      ))}

      <div className={actionsStyle}>
        <Button onClick={onApply} className={css({ flex: "1" })} isDisabled={!hasPendingChanges}>
          Apply
        </Button>
        <Button variant="outline" onClick={onClear} isDisabled={activeCount === 0 && !hasPendingChanges}>
          Clear
        </Button>
      </div>
      {hasPendingChanges ? (
        <p className={pendingStyle}>Press Apply to update the results.</p>
      ) : null}
    </div>
  );
}
