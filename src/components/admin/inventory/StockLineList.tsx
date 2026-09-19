"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { css } from "styled-system/css";
import type { StockLineDraft } from "./useStockLines";

const emptyStyle = css({
  padding: "10",
  textAlign: "center",
  fontSize: "sm",
  color: "fg.muted",
  border: "1px dashed",
  borderColor: "border.subtle",
  borderRadius: "md",
});

const listStyle = css({ display: "flex", flexDirection: "column", gap: "2" });

const rowStyle = css({
  display: "flex",
  alignItems: "center",
  gap: "3",
  padding: "3",
  borderRadius: "md",
  border: "1px solid",
  borderColor: "border.subtle",
  background: "bg.surface",
});

const detailStyle = css({ flex: "1", minWidth: "0", display: "flex", flexDirection: "column", gap: "0.5" });
const nameStyle = css({ fontSize: "sm", fontWeight: "medium", color: "fg.default" });
const metaStyle = css({ fontSize: "xs", color: "fg.muted" });
const qtyInputStyle = css({ width: "5.5rem", textAlign: "right" });

const resultStyle = (negative: boolean) =>
  css({
    fontSize: "xs",
    fontWeight: "medium",
    whiteSpace: "nowrap",
    color: negative ? "red.600" : "fg.muted",
  });

/**
 * The editable list of items in a stock operation.
 *
 * Shows the resulting stock per line, not just the current figure — an
 * operator wants to confirm "1 becomes 4" before committing, rather than do
 * the arithmetic themselves.
 */
export function StockLineList({
  lines,
  direction,
  onQuantityChange,
  onRemove,
}: {
  lines: StockLineDraft[];
  /** Whether the quantities add to stock or take from it, for the preview. */
  direction: "IN" | "OUT";
  onQuantityChange: (variantId: string, quantity: number) => void;
  onRemove: (variantId: string) => void;
}) {
  if (lines.length === 0) {
    return <p className={emptyStyle}>Scan a barcode or search to add items.</p>;
  }

  return (
    <div className={listStyle}>
      {lines.map(({ variant, quantity }) => {
        const resulting =
          direction === "IN" ? variant.available + quantity : variant.available - quantity;

        return (
          <div key={variant.variantId} className={rowStyle}>
            <div className={detailStyle}>
              <span className={nameStyle}>
                {variant.productName}
                {/* The implicit variant of an option-less product adds
                    nothing to read, so it is left off. */}
                {!variant.isDefault && ` · ${variant.variantName}`}
              </span>
              <span className={metaStyle}>
                {[variant.sku, variant.barcode].filter(Boolean).join(" · ")}
              </span>
            </div>

            <div className={css({ textAlign: "right" })}>
              <span className={metaStyle}>In stock {variant.available}</span>
              <br />
              <span className={resultStyle(resulting < 0)}>
                {resulting < 0 ? "Not enough stock" : `becomes ${resulting}`}
              </span>
            </div>

            <Input
              type="number"
              min={1}
              value={quantity}
              onChange={(event) => onQuantityChange(variant.variantId, Number(event.target.value))}
              className={qtyInputStyle}
              aria-label={`Quantity for ${variant.productName}`}
            />

            <Button
              variant="ghost"
              size="icon"
              onClick={() => onRemove(variant.variantId)}
              aria-label={`Remove ${variant.productName}`}
            >
              <X className={css({ height: "4", width: "4" })} />
            </Button>
          </div>
        );
      })}
    </div>
  );
}
