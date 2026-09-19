"use client";

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Receipt } from "lucide-react";
import { css } from "styled-system/css";
import { formatPaisa } from "@/modules/_shared/money";
import type { PosPaymentMethod } from "@/modules/orders";
import { VariantSearchField } from "@/components/admin/inventory/VariantSearchField";
import { useBarcodeScanner } from "@/components/scanning/useBarcodeScanner";
import { usePosCart } from "./usePosCart";
import { PosCartLines } from "./PosCartLines";
import { PosReceipt, type CompletedSale } from "./PosReceipt";
import { PosBill } from "./PosBill";
import type { UpiPayee } from "@/modules/payments/upi/upi-link";

const layoutStyle = css({
  display: "grid",
  // Mobile and tablet first: one column, cart above the payment panel.
  gridTemplateColumns: { base: "1fr", lg: "minmax(0, 3fr) minmax(22rem, 1fr)" },
  gap: "5",
  alignItems: "start",
});
const columnStyle = css({ display: "flex", flexDirection: "column", gap: "4" });
const panelStyle = css({
  display: "flex",
  flexDirection: "column",
  gap: "3",
  padding: "4",
  borderRadius: "md",
  border: "1px solid",
  borderColor: "border.subtle",
  background: "bg.surface",
  position: { lg: "sticky" },
  top: { lg: "4" },
});
const totalRowStyle = css({
  display: "flex",
  justifyContent: "space-between",
  fontSize: "sm",
  color: "fg.muted",
  fontVariantNumeric: "tabular-nums",
});
const grandRowStyle = css({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "baseline",
  fontFamily: "display",
  fontSize: "2xl",
  fontWeight: "semibold",
  fontVariantNumeric: "tabular-nums",
  paddingTop: "2",
  borderTop: "1px solid",
  borderColor: "border.subtle",
});
const methodGridStyle = css({ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "2" });
const fieldStyle = css({ display: "flex", flexDirection: "column", gap: "1.5" });
const hintStyle = css({ fontSize: "xs", color: "fg.muted" });

const METHODS: { value: PosPaymentMethod; label: string }[] = [
  { value: "CASH", label: "Cash" },
  { value: "UPI", label: "UPI" },
  { value: "CARD", label: "Card" },
  { value: "OTHER", label: "Other" },
];

/**
 * The counter.
 *
 * Built for a tablet held in one hand: large targets, a single column on
 * anything narrow, and the scanner listening page-wide so the operator never
 * has to tap into a field before scanning.
 */
export function PosTerminal({ upiPayee }: { upiPayee: UpiPayee | null }) {
  const cart = usePosCart();
  // Cart → bill → done. The bill step exists so a UPI customer can actually
  // pay before the sale is recorded as paid.
  const [stage, setStage] = useState<"CART" | "BILL">("CART");
  const [method, setMethod] = useState<PosPaymentMethod>("CASH");
  const [reference, setReference] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerMobile, setCustomerMobile] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState<CompletedSale | null>(null);
  const idempotencyKeyRef = useRef<string | null>(null);

  /**
   * Scanning works anywhere on the screen — a hardware scanner types wherever
   * focus happens to be, and at a counter that is rarely the search box.
   */
  const onScan = useCallback(
    async (event: { code: string }) => {
      const res = await fetch(`/api/admin/inventory/lookup?code=${encodeURIComponent(event.code)}`);
      const data = await res.json().catch(() => ({}));
      const found = data.results?.[0];
      if (!found) {
        toast.error(`Barcode not found: ${event.code}`);
        return;
      }
      cart.addVariant(found);
    },
    [cart],
  );

  useBarcodeScanner({ onScan, enabled: !completed && !submitting });

  const canSell = cart.lines.length > 0 && cart.overstocked.length === 0 && !submitting;

  /** Minted when the bill is raised, so the QR's reference matches the sale. */
  const saleReference =
    idempotencyKeyRef.current ??
    (idempotencyKeyRef.current = `POS-${Date.now().toString(36).toUpperCase()}`);

  const completeSale = async () => {
    if (cart.lines.length === 0 || cart.overstocked.length > 0) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/admin/pos/sale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lines: cart.toPayload(),
          payment: { method, reference: reference.trim() || undefined },
          customer:
            customerName.trim() || customerMobile.trim()
              ? { name: customerName.trim() || undefined, mobile: customerMobile.trim() || undefined }
              : undefined,
          idempotencyKey: saleReference,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        // The server's message is the specific one — "Only 1 left of …".
        toast.error(data.error ?? "Could not complete the sale");
        return;
      }

      setCompleted(data.sale);
      // A fresh sale gets a fresh key; reusing it would replay this one.
      idempotencyKeyRef.current = null;
    } catch {
      toast.error("Could not reach the server. Nothing was charged.");
    } finally {
      setSubmitting(false);
    }
  };

  const startNewSale = () => {
    cart.clear();
    setCompleted(null);
    setStage("CART");
    setReference("");
    setCustomerName("");
    setCustomerMobile("");
  };

  if (completed) {
    return <PosReceipt sale={completed} onNewSale={startNewSale} />;
  }

  if (stage === "BILL") {
    return (
      <PosBill
        lines={cart.lines}
        totals={cart.totals}
        method={method}
        payee={upiPayee}
        reference={saleReference}
        submitting={submitting}
        onBack={() => setStage("CART")}
        onConfirm={completeSale}
      />
    );
  }

  return (
    <div className={layoutStyle}>
      <div className={columnStyle}>
        <div className={fieldStyle}>
          <Label htmlFor="pos-search">Scan or search</Label>
          <VariantSearchField onSelect={cart.addVariant} autoFocus />
          <span className={hintStyle}>
            A scanner works anywhere on this screen — no need to tap the box first.
          </span>
        </div>

        <PosCartLines
          lines={cart.lines}
          onQuantityChange={cart.setQuantity}
          onRemove={cart.removeLine}
          onOverride={cart.setOverride}
        />
      </div>

      <div className={panelStyle}>
        <div className={totalRowStyle}>
          <span>{cart.totals.itemCount} item{cart.totals.itemCount === 1 ? "" : "s"}</span>
          <span>{formatPaisa(cart.totals.subtotalCents)}</span>
        </div>
        {/* Shown only when something was actually given away. */}
        {cart.totals.discountCents > 0 && (
          <div className={totalRowStyle}>
            <span>Discount</span>
            <span>−{formatPaisa(cart.totals.discountCents)}</span>
          </div>
        )}
        <div className={totalRowStyle}>
          <span>GST 3%</span>
          <span>{formatPaisa(cart.totals.taxCents)}</span>
        </div>
        <div className={grandRowStyle}>
          <span>Total</span>
          <span>{formatPaisa(cart.totals.grandTotalCents)}</span>
        </div>

        <div className={fieldStyle}>
          <Label>Payment</Label>
          <div className={methodGridStyle}>
            {METHODS.map((option) => (
              <Button
                key={option.value}
                variant={method === option.value ? "default" : "outline"}
                size="sm"
                onClick={() => setMethod(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        {method !== "CASH" && (
          <div className={fieldStyle}>
            <Label htmlFor="pos-reference">Reference</Label>
            <Input
              id="pos-reference"
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              placeholder={method === "UPI" ? "UPI transaction id" : "Approval code"}
            />
          </div>
        )}

        <div className={fieldStyle}>
          <Label htmlFor="pos-customer">Customer (optional)</Label>
          <Input
            id="pos-customer"
            value={customerName}
            onChange={(event) => setCustomerName(event.target.value)}
            placeholder="Name"
          />
          <Input
            value={customerMobile}
            onChange={(event) => setCustomerMobile(event.target.value)}
            placeholder="Mobile"
            aria-label="Customer mobile"
          />
          <span className={hintStyle}>
            Leave blank for a walk-in sale — no account is needed to sell.
          </span>
        </div>

        <Button size="lg" onClick={() => setStage("BILL")} disabled={!canSell}>
          <Receipt className={css({ height: "4", width: "4" })} />
          Generate bill
        </Button>

        {cart.overstocked.length > 0 && (
          <span className={css({ fontSize: "xs", color: "red.600" })}>
            Not enough stock for {cart.overstocked.length} item
            {cart.overstocked.length === 1 ? "" : "s"}.
          </span>
        )}
      </div>
    </div>
  );
}
