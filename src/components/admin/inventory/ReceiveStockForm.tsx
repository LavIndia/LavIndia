"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, PackagePlus } from "lucide-react";
import { useState } from "react";
import { css } from "styled-system/css";
import { VariantSearchField } from "./VariantSearchField";
import { StockLineList } from "./StockLineList";
import { useStockLines } from "./useStockLines";
import { useStockSubmit } from "./useStockSubmit";

const formStyle = css({ display: "flex", flexDirection: "column", gap: "5" });
const fieldStyle = css({ display: "flex", flexDirection: "column", gap: "2" });
const footerStyle = css({
  display: "flex",
  flexDirection: { base: "column", sm: "row" },
  alignItems: { base: "stretch", sm: "center" },
  justifyContent: "space-between",
  gap: "3",
  paddingTop: "2",
});
const totalStyle = css({ fontSize: "sm", color: "fg.muted" });

/**
 * Receive Stock.
 *
 * Scan or search to build the list, confirm the quantities, commit. It never
 * creates a product — an unknown barcode says so and leaves the operator to
 * search, because inventory does not own the catalog.
 */
export function ReceiveStockForm({ locationId }: { locationId?: string }) {
  const { lines, addVariant, setQuantity, removeLine, clear, totalUnits, toPayload } =
    useStockLines();
  const [reason, setReason] = useState("");
  const { submit, submitting } = useStockSubmit("/api/admin/inventory/receive", () => {
    clear();
    setReason("");
  });

  const commit = () =>
    submit(
      { lines: toPayload(), locationId, reason: reason.trim() || undefined },
      `Received ${totalUnits} ${totalUnits === 1 ? "unit" : "units"}`,
    );

  return (
    <div className={formStyle}>
      <div className={fieldStyle}>
        <Label htmlFor="receive-search">Add items</Label>
        <VariantSearchField onSelect={(variant) => addVariant(variant)} locationId={locationId} autoFocus />
      </div>

      <StockLineList
        lines={lines}
        direction="IN"
        onQuantityChange={setQuantity}
        onRemove={removeLine}
      />

      {/* Optional here — unlike an adjustment, receiving stock is
          self-explanatory. Offered for a delivery note or invoice number. */}
      {lines.length > 0 && (
        <div className={fieldStyle}>
          <Label htmlFor="receive-reason">Note (optional)</Label>
          <Input
            id="receive-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Delivery note or supplier reference"
            maxLength={500}
          />
        </div>
      )}

      <div className={footerStyle}>
        <span className={totalStyle}>
          {lines.length === 0
            ? "Nothing added yet"
            : `${lines.length} ${lines.length === 1 ? "item" : "items"} · ${totalUnits} ${
                totalUnits === 1 ? "unit" : "units"
              }`}
        </span>

        <div className={css({ display: "flex", gap: "3" })}>
          {lines.length > 0 && (
            <Button variant="outline" onClick={clear} disabled={submitting}>
              Clear
            </Button>
          )}
          <Button onClick={commit} disabled={lines.length === 0 || submitting}>
            {submitting ? (
              <Loader2 className={css({ height: "4", width: "4", animation: "spin 1s linear infinite" })} />
            ) : (
              <PackagePlus className={css({ height: "4", width: "4" })} />
            )}
            Receive stock
          </Button>
        </div>
      </div>
    </div>
  );
}
