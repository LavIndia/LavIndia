"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, SlidersHorizontal } from "lucide-react";
import { css } from "styled-system/css";
import type { AdjustmentType } from "@/modules/inventory";
import { VariantSearchField } from "./VariantSearchField";
import { StockLineList } from "./StockLineList";
import { useStockLines } from "./useStockLines";
import { useStockSubmit } from "./useStockSubmit";

const formStyle = css({ display: "flex", flexDirection: "column", gap: "5" });
const fieldStyle = css({ display: "flex", flexDirection: "column", gap: "2" });
const rowStyle = css({
  display: "grid",
  gridTemplateColumns: { base: "1fr", md: "14rem 1fr" },
  gap: "4",
});
const footerStyle = css({
  display: "flex",
  flexDirection: { base: "column", sm: "row" },
  alignItems: { base: "stretch", sm: "center" },
  justifyContent: "space-between",
  gap: "3",
  paddingTop: "2",
});
const totalStyle = css({ fontSize: "sm", color: "fg.muted" });
const hintStyle = css({ fontSize: "xs", color: "fg.muted" });

/**
 * The adjustment kinds, with what each one means in plain words.
 *
 * A curated list rather than free text so the ledger stays groupable — "how
 * much did we write off to damage this quarter" is only answerable if damage
 * is its own type rather than a note somebody typed.
 */
const TYPES: { value: AdjustmentType; label: string; help: string; direction: "IN" | "OUT" }[] = [
  {
    value: "ADJUSTMENT_IN",
    label: "Count up",
    help: "A stocktake found more than the system expected.",
    direction: "IN",
  },
  {
    value: "ADJUSTMENT_OUT",
    label: "Count down",
    help: "A stocktake found fewer — miscounted, misplaced or lost.",
    direction: "OUT",
  },
  {
    value: "DAMAGE",
    label: "Damage / write-off",
    help: "Pieces that can no longer be sold. Recorded separately so losses can be totalled.",
    direction: "OUT",
  },
];

/**
 * Adjustments.
 *
 * A reason is required, always. An adjustment is the one place stock can move
 * without a sale or a delivery behind it, so an unexplained one is precisely
 * the entry nobody can account for at audit time.
 */
export function AdjustStockForm({ locationId }: { locationId?: string }) {
  const { lines, addVariant, setQuantity, removeLine, clear, totalUnits, toPayload } =
    useStockLines();
  const [type, setType] = useState<AdjustmentType>("ADJUSTMENT_IN");
  const [reason, setReason] = useState("");
  const { submit, submitting } = useStockSubmit("/api/admin/inventory/adjust", () => {
    clear();
    setReason("");
  });

  const selected = TYPES.find((t) => t.value === type)!;
  const canSubmit = lines.length > 0 && reason.trim().length > 0 && !submitting;

  const commit = () =>
    submit(
      { lines: toPayload(), type, reason: reason.trim(), locationId },
      `${selected.label} applied to ${totalUnits} ${totalUnits === 1 ? "piece" : "pieces"}`,
    );

  return (
    <div className={formStyle}>
      <div className={rowStyle}>
        <div className={fieldStyle}>
          <Label htmlFor="adjust-type">Adjustment</Label>
          <Select value={type} onValueChange={(next) => setType(next as AdjustmentType)}>
            <SelectTrigger id="adjust-type" aria-label="Adjustment type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TYPES.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className={hintStyle}>{selected.help}</span>
        </div>

        <div className={fieldStyle}>
          <Label htmlFor="adjust-search">Add items</Label>
          <VariantSearchField onSelect={(variant) => addVariant(variant)} locationId={locationId} />
          <span className={hintStyle}>Scan a barcode, or search by product name or SKU.</span>
        </div>
      </div>

      <StockLineList
        lines={lines}
        direction={selected.direction}
        onQuantityChange={setQuantity}
        onRemove={removeLine}
      />

      <div className={fieldStyle}>
        <Label htmlFor="adjust-reason">Reason (required)</Label>
        <Input
          id="adjust-reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Stocktake 19 Sep — two pieces found in the window display"
          maxLength={500}
        />
        <span className={hintStyle}>
          Written into the permanent movement ledger. Say what happened, not just
          &ldquo;correction&rdquo; — this is what someone reads a year from now.
        </span>
      </div>

      <div className={footerStyle}>
        <span className={totalStyle}>
          {lines.length === 0
            ? "Nothing added yet"
            : `${lines.length} ${lines.length === 1 ? "item" : "items"} · ${totalUnits} ${
                totalUnits === 1 ? "piece" : "pieces"
              }`}
        </span>

        <div className={css({ display: "flex", gap: "3" })}>
          {lines.length > 0 && (
            <Button variant="outline" onClick={clear} disabled={submitting}>
              Clear
            </Button>
          )}
          <Button onClick={commit} disabled={!canSubmit}>
            {submitting ? (
              <Loader2
                className={css({ height: "4", width: "4", animation: "spin 1s linear infinite" })}
              />
            ) : (
              <SlidersHorizontal className={css({ height: "4", width: "4" })} />
            )}
            Apply adjustment
          </Button>
        </div>
      </div>
    </div>
  );
}
