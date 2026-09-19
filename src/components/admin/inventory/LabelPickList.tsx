"use client";

import { css } from "styled-system/css";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { LookupResult } from "./useVariantLookup";

const listStyle = css({ display: "flex", flexDirection: "column", gap: "2" });
const rowStyle = css({
  display: "flex",
  alignItems: "center",
  gap: "3",
  padding: "2.5",
  borderRadius: "md",
  border: "1px solid",
  borderColor: "border.subtle",
  background: "bg.surface",
});
const rowMainStyle = css({ flex: "1", minWidth: "0", display: "flex", flexDirection: "column" });
const rowNameStyle = css({ fontSize: "sm", fontWeight: "medium" });
const rowMetaStyle = css({ fontSize: "xs", color: "fg.muted" });
const qtyStyle = css({ width: "4.5rem", textAlign: "right" });
const emptyStyle = css({
  padding: "8",
  textAlign: "center",
  fontSize: "sm",
  color: "fg.muted",
  border: "1px dashed",
  borderColor: "border.subtle",
  borderRadius: "md",
});

export interface LabelPick {
  variant: LookupResult;
  quantity: number;
}

/** What is queued for printing, and how many of each. */
export function LabelPickList({
  picks,
  onQuantityChange,
  onRemove,
}: {
  picks: LabelPick[];
  onQuantityChange: (variantId: string, quantity: number) => void;
  onRemove: (variantId: string) => void;
}) {
  if (picks.length === 0) return <p className={emptyStyle}>Nothing chosen yet.</p>;

  return (
    <div className={listStyle}>
      {picks.map(({ variant, quantity }) => (
        <div key={variant.variantId} className={rowStyle}>
          <span className={rowMainStyle}>
            <span className={rowNameStyle}>
              {variant.productName}
              {!variant.isDefault && ` · ${variant.variantName}`}
            </span>
            <span className={rowMetaStyle}>{variant.barcode}</span>
          </span>
          <Input
            type="number"
            min={1}
            value={quantity}
            onChange={(event) => onQuantityChange(variant.variantId, Number(event.target.value))}
            className={qtyStyle}
            aria-label={`Number of labels for ${variant.productName}`}
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
      ))}
    </div>
  );
}
