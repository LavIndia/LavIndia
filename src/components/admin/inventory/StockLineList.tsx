"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { css } from "styled-system/css";
import type { CostField, StockLineDraft } from "./useStockLines";
import { COST_BASES, resolveCosts, savedCents, type CostBasis } from "./purchase-costs";
import { formatPaisa } from "@/modules/_shared/money";

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

/** The item and its quantity on one line, the money on the next. */
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
const topRowStyle = css({ display: "flex", alignItems: "center", gap: "3" });
const costRowStyle = css({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "flex-end",
  gap: "2",
  paddingTop: "2",
  borderTop: "1px dashed",
  borderColor: "border.subtle",
});
const costFieldStyle = css({ display: "flex", flexDirection: "column", gap: "1" });
const costLabelStyle = css({ fontSize: "xs", color: "fg.muted", whiteSpace: "nowrap" });
const costInputStyle = css({ width: "6.5rem", textAlign: "right" });
const basisSelectStyle = css({
  height: "9",
  paddingX: "2",
  borderRadius: "md",
  border: "1px solid",
  borderColor: "border.subtle",
  background: "bg.surface",
  color: "fg.default",
  fontSize: "sm",
});
const savedStyle = css({
  fontSize: "xs",
  fontWeight: "medium",
  color: "success",
  marginLeft: "auto",
  whiteSpace: "nowrap",
});
const overStyle = css({
  fontSize: "xs",
  fontWeight: "medium",
  color: "danger",
  marginLeft: "auto",
  whiteSpace: "nowrap",
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
  onCostChange,
  onCostBasisChange,
  onRemove,
}: {
  lines: StockLineDraft[];
  /** Whether the quantities add to stock or take from it, for the preview. */
  direction: "IN" | "OUT";
  onQuantityChange: (variantId: string, quantity: number) => void;
  /**
   * Supplied only when the operation is a purchase. An adjustment has no
   * price paid, so the whole money row is absent there rather than disabled.
   */
  onCostChange?: (variantId: string, field: CostField, value: string) => void;
  onCostBasisChange?: (variantId: string, basis: CostBasis) => void;
  onRemove: (variantId: string) => void;
}) {
  if (lines.length === 0) {
    return <p className={emptyStyle}>Scan a barcode or search to add items.</p>;
  }

  const pricing = Boolean(onCostChange && onCostBasisChange);

  return (
    <div className={listStyle}>
      {lines.map((line) => {
        const { variant, quantity } = line;
        const resulting =
          direction === "IN" ? variant.available + quantity : variant.available - quantity;

        const resolved = resolveCosts(line, quantity);
        const saved = savedCents(resolved, quantity);

        return (
          <div key={variant.variantId} className={pricing ? lineStyle : rowStyle}>
            <div className={pricing ? topRowStyle : undefined}>
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
                onChange={(event) =>
                  onQuantityChange(variant.variantId, Number(event.target.value))
                }
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

            {pricing && (
              <div className={costRowStyle}>
                <div className={costFieldStyle}>
                  <label
                    className={costLabelStyle}
                    htmlFor={`basis-${variant.variantId}`}
                  >
                    Prices are
                  </label>
                  <select
                    id={`basis-${variant.variantId}`}
                    className={basisSelectStyle}
                    value={line.costBasis ?? "UNIT"}
                    onChange={(event) =>
                      onCostBasisChange!(variant.variantId, event.target.value as CostBasis)
                    }
                  >
                    {COST_BASES.map((basis) => (
                      <option key={basis.value} value={basis.value}>
                        {basis.label}
                      </option>
                    ))}
                  </select>
                </div>

                <CostInput
                  id={`list-${variant.variantId}`}
                  label="Asking price"
                  value={line.listCost}
                  onChange={(v) => onCostChange!(variant.variantId, "listCost", v)}
                  hint={`What they asked for ${variant.productName}`}
                />
                <CostInput
                  id={`agreed-${variant.variantId}`}
                  label="After bargain"
                  value={line.agreedCost}
                  onChange={(v) => onCostChange!(variant.variantId, "agreedCost", v)}
                  hint={`Agreed price for ${variant.productName}`}
                />
                <CostInput
                  id={`cost-${variant.variantId}`}
                  label="Your cost"
                  value={line.unitCost}
                  onChange={(v) => onCostChange!(variant.variantId, "unitCost", v)}
                  hint={`Final cost for ${variant.productName}`}
                />

                {/* Only ever shown when both ends of the comparison are
                    known. A line with no asking price did not save nothing,
                    it simply cannot say. */}
                {saved !== null && saved > 0 && (
                  <span className={savedStyle}>Saved {formatPaisa(saved)}</span>
                )}
                {saved !== null && saved < 0 && (
                  <span className={overStyle}>
                    {formatPaisa(Math.abs(saved))} over the asking price
                  </span>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** One money box with its caption. Three of them sit on a purchase line. */
function CostInput({
  id,
  label,
  value,
  onChange,
  hint,
}: {
  id: string;
  label: string;
  value?: string;
  onChange: (value: string) => void;
  hint: string;
}) {
  return (
    <div className={costFieldStyle}>
      <label className={costLabelStyle} htmlFor={id}>
        {label}
      </label>
      <Input
        id={id}
        type="number"
        min={0}
        step="0.01"
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        className={costInputStyle}
        placeholder="₹"
        aria-label={hint}
      />
    </div>
  );
}
