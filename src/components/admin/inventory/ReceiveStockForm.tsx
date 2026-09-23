"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, PackagePlus } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { css } from "styled-system/css";
import { formatPaisa } from "@/modules/_shared/money";
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
const selectStyle = css({
  height: "10",
  paddingX: "3",
  borderRadius: "md",
  border: "1px solid",
  borderColor: "border.subtle",
  background: "bg.surface",
  color: "fg.default",
  fontSize: "sm",
  width: "full",
});
const hintStyle = css({ fontSize: "xs", color: "fg.muted", lineHeight: "1.5" });
const invoiceGridStyle = css({
  display: "grid",
  gap: "3",
  gridTemplateColumns: { base: "1fr", sm: "repeat(2, 1fr)" },
});
const savedTotalStyle = css({ fontSize: "sm", color: "success", fontWeight: "medium" });
const linkStyle = css({
  color: "accent.pressed",
  textDecoration: "underline",
  textUnderlineOffset: "3px",
});

interface SupplierOption {
  id: string;
  name: string;
}

/**
 * Receive Stock.
 *
 * Scan or search to build the list, confirm the quantities, commit. It never
 * creates a product — an unknown barcode says so and leaves the operator to
 * search, because inventory does not own the catalog.
 */
export function ReceiveStockForm({ locationId }: { locationId?: string }) {
  const {
    lines,
    addVariant,
    setQuantity,
    setCost,
    setCostBasis,
    removeLine,
    clear,
    totalUnits,
    totals,
    toPayload,
  } = useStockLines();
  const [reason, setReason] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const { submit, submitting } = useStockSubmit("/api/admin/inventory/receive", () => {
    clear();
    setReason("");
    setSupplierId("");
    setInvoiceNumber("");
    setInvoiceDate("");
  });

  useEffect(() => {
    fetch("/api/admin/suppliers")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (Array.isArray(data)) setSuppliers(data);
      })
      .catch(() => {
        // The vendor is optional, so a failed list must not block receiving.
      });
  }, []);

  const commit = () =>
    submit(
      {
        lines: toPayload(),
        locationId,
        supplierId: supplierId || undefined,
        invoiceNumber: invoiceNumber.trim() || undefined,
        invoiceDate: invoiceDate || undefined,
        reason: reason.trim() || undefined,
      },
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
        onCostChange={setCost}
        onCostBasisChange={setCostBasis}
        onRemove={removeLine}
      />

      {/* Who it came from. Optional, because a delivery can be booked in
          before anyone works out which vendor it was. */}
      {lines.length > 0 && (
        <div className={fieldStyle}>
          <Label htmlFor="receive-supplier">Supplier (optional)</Label>
          <select
            id="receive-supplier"
            className={selectStyle}
            value={supplierId}
            onChange={(event) => setSupplierId(event.target.value)}
          >
            <option value="">Not recorded</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
              </option>
            ))}
          </select>
          <p className={hintStyle}>
            Choosing a supplier is what lets Accounting total what you spend with each of
            them.{" "}
            <Link href="/admin/suppliers" className={linkStyle}>
              Manage suppliers
            </Link>
          </p>
        </div>
      )}

      {/* The bill this delivery came on. Kept with the vendor because all
          three describe the delivery rather than any one piece in it. */}
      {lines.length > 0 && (
        <div className={invoiceGridStyle}>
          <div className={fieldStyle}>
            <Label htmlFor="receive-invoice">Invoice number (optional)</Label>
            <Input
              id="receive-invoice"
              value={invoiceNumber}
              onChange={(event) => setInvoiceNumber(event.target.value)}
              placeholder="As printed on the vendor's bill"
              maxLength={100}
            />
          </div>
          <div className={fieldStyle}>
            <Label htmlFor="receive-invoice-date">Invoice date (optional)</Label>
            <Input
              id="receive-invoice-date"
              type="date"
              value={invoiceDate}
              onChange={(event) => setInvoiceDate(event.target.value)}
            />
          </div>
        </div>
      )}

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
          {lines.length === 0 ? (
            "Nothing added yet"
          ) : (
            <>
              {`${lines.length} ${lines.length === 1 ? "item" : "items"} · ${totalUnits} ${
                totalUnits === 1 ? "unit" : "units"
              }${totals.costCents > 0 ? ` · ${formatPaisa(totals.costCents)}` : ""}`}
              {/* Said only when it can be said honestly: a delivery where no
                  asking price was entered has no saving to report. */}
              {totals.savedCents > 0 && (
                <>
                  {" · "}
                  <span className={savedTotalStyle}>
                    saved {formatPaisa(totals.savedCents)}
                  </span>
                </>
              )}
            </>
          )}
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
