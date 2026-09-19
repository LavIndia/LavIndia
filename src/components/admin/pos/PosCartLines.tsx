"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Minus, Plus, RotateCcw, X } from "lucide-react";
import { css } from "styled-system/css";
import { formatPaisa } from "@/modules/_shared/money";
import type { PosCartLine } from "./usePosCart";

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
const lineStyle = css({
  display: "flex",
  flexDirection: "column",
  gap: "2",
  padding: "3",
  borderRadius: "md",
  border: "1px solid",
  borderColor: "border.subtle",
  background: "bg.surface",
});
const topRowStyle = css({ display: "flex", alignItems: "flex-start", gap: "3" });
const nameColStyle = css({ flex: "1", minWidth: "0", display: "flex", flexDirection: "column", gap: "0.5" });
const nameStyle = css({ fontSize: "sm", fontWeight: "medium" });
const metaStyle = css({ fontSize: "xs", color: "fg.muted" });
const warnStyle = css({ fontSize: "xs", color: "red.600", fontWeight: "medium" });
const bottomRowStyle = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "3",
});
const qtyGroupStyle = css({ display: "flex", alignItems: "center", gap: "1" });
// Large tap targets: this is used one-handed on a tablet at a counter.
const qtyButtonStyle = css({ height: "10", width: "10" });
const qtyInputStyle = css({
  width: "3.5rem",
  textAlign: "center",
  fontVariantNumeric: "tabular-nums",
});
const priceColStyle = css({
  display: "flex",
  alignItems: "center",
  gap: "2",
  marginLeft: "auto",
});
const struckStyle = css({
  fontSize: "xs",
  color: "fg.muted",
  textDecoration: "line-through",
  fontVariantNumeric: "tabular-nums",
});
/** The price field itself, edited in place rather than behind a button. */
const priceFieldStyle = css({
  display: "flex",
  alignItems: "center",
  gap: "1",
  paddingInline: "2",
  borderRadius: "md",
  border: "1px solid",
  borderColor: "border.subtle",
  background: "bg.canvas",
  "&:focus-within": { borderColor: "accent.default" },
});
const rupeeStyle = css({ fontSize: "sm", color: "fg.muted" });
const priceInputStyle = css({
  width: "5.5rem",
  textAlign: "right",
  fontWeight: "semibold",
  fontVariantNumeric: "tabular-nums",
  border: "none",
  background: "transparent",
  paddingInline: "0",
  "&:focus-visible": { outline: "none", boxShadow: "none" },
});
const lineTotalStyle = css({
  fontWeight: "semibold",
  fontVariantNumeric: "tabular-nums",
  minWidth: "5rem",
  textAlign: "right",
});
const reasonRowStyle = css({
  display: "flex",
  alignItems: "center",
  gap: "2",
  paddingTop: "2",
  borderTop: "1px solid",
  borderColor: "border.subtle",
});

/**
 * The sale in progress.
 *
 * The price is edited in place — one tap and a number, rather than a button
 * that reveals a form. The catalog price stays visible, struck through, so a
 * concession is never hidden, and the reason field appears only once a price
 * has actually changed, because until then there is nothing to explain.
 */
export function PosCartLines({
  lines,
  onQuantityChange,
  onRemove,
  onOverride,
}: {
  lines: PosCartLine[];
  onQuantityChange: (variantId: string, quantity: number) => void;
  onRemove: (variantId: string) => void;
  onOverride: (variantId: string, priceCents: number | undefined, reason?: string) => void;
}) {
  if (lines.length === 0) {
    return <p className={emptyStyle}>Scan a tag or search to start the sale.</p>;
  }

  return (
    <div className={listStyle}>
      {lines.map((line) => {
        const catalog = line.variant.priceCents;
        const charged = line.overridePriceCents ?? catalog;
        const isOverridden = charged !== catalog;
        const short = line.quantity > line.variant.available;
        const id = line.variant.variantId;

        return (
          <div key={id} className={lineStyle}>
            <div className={topRowStyle}>
              <span className={nameColStyle}>
                <span className={nameStyle}>
                  {line.variant.productName}
                  {!line.variant.isDefault && ` · ${line.variant.variantName}`}
                </span>
                <span className={metaStyle}>{line.variant.sku ?? line.variant.barcode}</span>
                {short && (
                  <span className={warnStyle}>
                    Only {line.variant.available} in stock
                  </span>
                )}
              </span>
              <Button variant="ghost" size="icon" onClick={() => onRemove(id)} aria-label="Remove">
                <X className={css({ height: "4", width: "4" })} />
              </Button>
            </div>

            <div className={bottomRowStyle}>
              <span className={qtyGroupStyle}>
                <Button
                  variant="outline"
                  size="icon"
                  className={qtyButtonStyle}
                  onClick={() => onQuantityChange(id, line.quantity - 1)}
                  aria-label="Reduce quantity"
                >
                  <Minus className={css({ height: "4", width: "4" })} />
                </Button>
                <Input
                  type="number"
                  min={1}
                  value={line.quantity}
                  onChange={(event) => onQuantityChange(id, Number(event.target.value))}
                  className={qtyInputStyle}
                  aria-label={`Quantity for ${line.variant.productName}`}
                />
                <Button
                  variant="outline"
                  size="icon"
                  className={qtyButtonStyle}
                  onClick={() => onQuantityChange(id, line.quantity + 1)}
                  aria-label="Increase quantity"
                >
                  <Plus className={css({ height: "4", width: "4" })} />
                </Button>
              </span>

              <span className={priceColStyle}>
                {/* The list price stays visible when discounted, so a
                    concession always reads as a concession. */}
                {isOverridden && <span className={struckStyle}>{formatPaisa(catalog)}</span>}

                {/* Edited in place. Changing a price is one tap and a number,
                    not a button that reveals a form. */}
                <span className={priceFieldStyle}>
                  <span className={rupeeStyle}>₹</span>
                  <Input
                    type="number"
                    min={0}
                    value={Math.round(charged / 100)}
                    onFocus={(event) => event.currentTarget.select()}
                    onChange={(event) => {
                      const rupees = Number(event.target.value);
                      const next = event.target.value === "" ? catalog : Math.round(rupees * 100);
                      onOverride(id, next === catalog ? undefined : next, line.overrideReason);
                    }}
                    className={priceInputStyle}
                    aria-label={`Price for ${line.variant.productName}`}
                  />
                </span>

                {line.quantity > 1 && (
                  <span className={lineTotalStyle}>{formatPaisa(charged * line.quantity)}</span>
                )}

                {isOverridden && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onOverride(id, undefined, undefined)}
                    aria-label="Reset to the catalog price"
                  >
                    <RotateCcw className={css({ height: "3.5", width: "3.5" })} />
                  </Button>
                )}
              </span>
            </div>

            {/* The reason appears only once a price has actually changed —
                there is nothing to explain until then. */}
            {isOverridden && (
              <div className={reasonRowStyle}>
                <Input
                  placeholder="Why? e.g. long-standing customer"
                  value={line.overrideReason ?? ""}
                  onChange={(event) =>
                    onOverride(id, line.overridePriceCents, event.target.value)
                  }
                  aria-label="Reason for the price change"
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
