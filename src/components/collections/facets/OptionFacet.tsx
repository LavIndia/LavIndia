"use client";

import { Check } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import type { Facet } from "@/components/collections/facets/facet-model";
import { css, cx } from "styled-system/css";

/**
 * One facet of option values: swatches when every value has a colour, a
 * checkbox list otherwise. Each value shows how many loaded products carry
 * it; a value none of them carries stays available but dimmed.
 */

const sectionStyle = css({ marginBottom: "6" });
const headingStyle = css({
  fontSize: "sm",
  fontWeight: "semibold",
  color: "fg.default",
  marginBottom: "3",
});
const listStyle = css({ display: "flex", flexDirection: "column", gap: "2" });
const rowStyle = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "2",
});
const countStyle = css({ fontSize: "xs", color: "fg.muted", fontVariantNumeric: "tabular-nums" });
const dimStyle = css({ opacity: 0.5 });

const swatchRowStyle = css({ display: "flex", flexWrap: "wrap", gap: "2" });
const swatchStyle = css({
  position: "relative",
  display: "inline-flex",
  alignItems: "center",
  gap: "2",
  borderRadius: "full",
  border: "1px solid",
  borderColor: "border.subtle",
  background: "bg.surface",
  paddingInline: "2.5",
  paddingBlock: "1",
  fontSize: "xs",
  fontWeight: "medium",
  color: "fg.default",
  cursor: "pointer",
  transition: "border-color 0.15s ease, box-shadow 0.15s ease",
  "&:hover": { borderColor: "accent.default" },
  "&:focus-visible": { outline: "2px solid", outlineColor: "accent.default", outlineOffset: "2px" },
});
const swatchSelectedStyle = css({
  borderColor: "accent.pressed",
  boxShadow: "gold",
});
const swatchDotStyle = css({
  display: "inline-block",
  height: "3.5",
  width: "3.5",
  borderRadius: "full",
  border: "1px solid",
  borderColor: "border.subtle",
});

export function OptionFacet({
  facet,
  selected,
  onToggle,
}: {
  facet: Facet;
  selected: string[];
  onToggle: (value: string, checked: boolean) => void;
}) {
  if (facet.options.length === 0) return null;

  return (
    <div className={sectionStyle}>
      <h4 className={headingStyle}>{facet.name}</h4>

      {facet.presentation === "swatches" ? (
        <div className={swatchRowStyle} role="group" aria-label={facet.name}>
          {facet.options.map((option) => {
            const isSelected = selected.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={isSelected}
                className={cx(
                  swatchStyle,
                  isSelected && swatchSelectedStyle,
                  option.count === 0 && !isSelected && dimStyle,
                )}
                onClick={() => onToggle(option.value, !isSelected)}
              >
                <span className={swatchDotStyle} style={{ background: option.color ?? undefined }} />
                {option.label}
                <span className={countStyle}>{option.count}</span>
                {isSelected ? <Check size={12} aria-hidden /> : null}
              </button>
            );
          })}
        </div>
      ) : (
        <div className={listStyle}>
          {facet.options.map((option) => {
            const isSelected = selected.includes(option.value);
            return (
              <div
                key={option.value}
                className={cx(rowStyle, option.count === 0 && !isSelected && dimStyle)}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={(checked) => onToggle(option.value, checked)}
                >
                  {option.label}
                </Checkbox>
                <span className={countStyle}>{option.count}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
