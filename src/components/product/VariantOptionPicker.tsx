"use client";

import type { OptionAxis, VariantOptionDimension } from "@/modules/catalog/client";
import { css, cx } from "styled-system/css";

/**
 * One selector per option dimension — Colour, then Size — rather than a flat
 * list of whole variants.
 *
 * Listing variants made a two-dimension product unreadable: a button saying
 * "45 cm" could not tell a shopper which metal it was. Here the metal is
 * chosen on one row and the length on the next, which is also how the piece
 * is described in the shop.
 *
 * A value that exists but does not go with the current choices is shown
 * struck through and disabled, so the shopper can see it exists and see that
 * this combination is not made; one that is simply sold out says so.
 */

const wrapStyle = css({ display: "flex", flexDirection: "column", gap: "5" });
const axisStyle = css({ display: "flex", flexDirection: "column", gap: "2" });

const labelRowStyle = css({
  display: "flex",
  alignItems: "baseline",
  gap: "2",
});

const labelStyle = css({
  fontSize: "sm",
  fontWeight: "semibold",
  color: "fg.default",
  letterSpacing: "0.02em",
});

const chosenStyle = css({ fontSize: "sm", color: "fg.muted" });

const valuesStyle = css({ display: "flex", flexWrap: "wrap", gap: "2" });

const chipStyle = css({
  display: "inline-flex",
  alignItems: "center",
  gap: "2",
  borderRadius: "full",
  border: "1px solid",
  borderColor: "border.subtle",
  background: "bg.surface",
  paddingInline: "4",
  paddingBlock: "2",
  fontSize: "sm",
  fontWeight: "medium",
  color: "fg.default",
  cursor: "pointer",
  transition: "border-color 0.15s ease, box-shadow 0.15s ease, color 0.15s ease",
  "&:hover:not(:disabled)": { borderColor: "accent.default" },
  "&:focus-visible": { outline: "2px solid", outlineColor: "accent.default", outlineOffset: "2px" },
});

const selectedStyle = css({
  borderColor: "accent.pressed",
  boxShadow: "gold",
  background: "gold.50",
  color: "gold.700",
});

const unavailableStyle = css({
  color: "fg.muted",
  opacity: 0.5,
  cursor: "not-allowed",
  textDecoration: "line-through",
});

const soldOutStyle = css({ color: "fg.muted", opacity: 0.7 });
const soldOutNoteStyle = css({ fontSize: "2xs", textTransform: "uppercase", letterSpacing: "0.06em" });

export interface VariantOptionPickerProps {
  axes: OptionAxis[];
  onSelect: (dimension: VariantOptionDimension, value: string) => void;
}

export function VariantOptionPicker({ axes, onSelect }: VariantOptionPickerProps) {
  if (axes.length === 0) return null;

  return (
    <div className={wrapStyle}>
      {axes.map((axis) => {
        const chosen = axis.values.find((v) => v.selected);
        return (
          <div key={axis.dimension} className={axisStyle}>
            <div className={labelRowStyle}>
              <h3 className={labelStyle}>{axis.label}</h3>
              {/* Naming the choice matters for a value like "41 – 45 cm",
                  where the chip alone reads as a range, not a decision. */}
              {chosen ? <span className={chosenStyle}>{chosen.value}</span> : null}
            </div>
            <div className={valuesStyle} role="radiogroup" aria-label={axis.label}>
              {axis.values.map((value) => (
                <button
                  key={value.value}
                  type="button"
                  role="radio"
                  aria-checked={value.selected}
                  disabled={!value.available}
                  title={
                    !value.available
                      ? `Not made in this combination`
                      : !value.inStock
                        ? "Out of stock"
                        : undefined
                  }
                  className={cx(
                    chipStyle,
                    value.selected && selectedStyle,
                    !value.available && unavailableStyle,
                    value.available && !value.inStock && soldOutStyle,
                  )}
                  onClick={() => onSelect(axis.dimension, value.value)}
                >
                  {value.value}
                  {value.available && !value.inStock ? (
                    <span className={soldOutNoteStyle}>Sold out</span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
