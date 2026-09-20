"use client";

import { Slider } from "@/components/ui/slider";
import type { PriceBounds } from "@/components/collections/facets/facet-model";
import { css } from "styled-system/css";

/** The price range, bounded by what the listing actually contains. */

const sectionStyle = css({ marginBottom: "6" });
const headingStyle = css({
  fontSize: "sm",
  fontWeight: "semibold",
  color: "fg.default",
  marginBottom: "3",
});
const valuesStyle = css({
  display: "flex",
  justifyContent: "space-between",
  fontSize: "sm",
  color: "fg.muted",
  marginTop: "2",
});

export function PriceFacet({
  bounds,
  range,
  onChange,
}: {
  bounds: PriceBounds;
  range: [number, number];
  onChange: (value: [number, number]) => void;
}) {
  return (
    <div className={sectionStyle}>
      <h4 className={headingStyle}>Price (₹)</h4>
      <Slider
        value={range}
        onValueChange={(value) => onChange(value as [number, number])}
        min={bounds.min}
        max={bounds.max}
        step={bounds.step}
        aria-label="Price range"
      />
      <div className={valuesStyle}>
        <span>₹{range[0].toLocaleString()}</span>
        <span>₹{range[1].toLocaleString()}</span>
      </div>
    </div>
  );
}
