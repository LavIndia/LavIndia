"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { css } from "styled-system/css";
import { formatPaisa } from "@/modules/_shared/money";
import type { UpiPayee } from "@/modules/payments/upi/upi-link";
import type { PosPaymentMethod } from "@/modules/orders";
import { UpiQrCode } from "./UpiQrCode";
import type { PosCartLine } from "./usePosCart";

const wrapStyle = css({
  display: "grid",
  gridTemplateColumns: { base: "1fr", lg: "minmax(0, 1fr) 20rem" },
  gap: "5",
  alignItems: "start",
});
const billStyle = css({
  display: "flex",
  flexDirection: "column",
  gap: "3",
  padding: "5",
  borderRadius: "md",
  border: "1px solid",
  borderColor: "border.subtle",
  background: "bg.surface",
});
const titleStyle = css({ fontFamily: "display", fontSize: "xl", fontWeight: "semibold" });
const lineStyle = css({
  display: "flex",
  justifyContent: "space-between",
  gap: "3",
  fontSize: "sm",
  fontVariantNumeric: "tabular-nums",
});
const lineNameStyle = css({ display: "flex", flexDirection: "column" });
const metaStyle = css({ fontSize: "xs", color: "fg.muted" });
const totalsStyle = css({
  display: "flex",
  flexDirection: "column",
  gap: "1.5",
  paddingTop: "3",
  borderTop: "1px solid",
  borderColor: "border.subtle",
});
const grandStyle = css({
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
const payPanelStyle = css({
  display: "flex",
  flexDirection: "column",
  gap: "4",
  padding: "5",
  borderRadius: "md",
  border: "1px solid",
  borderColor: "border.subtle",
  background: "bg.surface",
  position: { lg: "sticky" },
  top: { lg: "4" },
});
const stepStyle = css({ fontSize: "xs", color: "fg.muted", lineHeight: "relaxed" });
const actionsStyle = css({ display: "flex", flexDirection: "column", gap: "2" });

/**
 * The bill, shown before the sale is committed.
 *
 * This step exists because of UPI: the customer has to see the amount and pay
 * it before anyone can honestly mark the sale paid. Presenting the bill first
 * and confirming afterwards matches what actually happens at the counter,
 * instead of recording a payment that has not been made yet.
 *
 * Nothing is written until "Payment received" — no order, no stock movement,
 * no invoice number. Backing out here leaves no trace.
 */
export function PosBill({
  lines,
  totals,
  method,
  payee,
  reference,
  submitting,
  onBack,
  onConfirm,
}: {
  lines: PosCartLine[];
  totals: { subtotalCents: number; discountCents: number; taxCents: number; grandTotalCents: number };
  method: PosPaymentMethod;
  payee: UpiPayee | null;
  /** The reference the QR carries, so the payment can be matched later. */
  reference: string;
  submitting: boolean;
  onBack: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className={wrapStyle}>
      <div className={billStyle}>
        <span className={titleStyle}>Bill</span>

        {lines.map((line) => {
          const charged = line.overridePriceCents ?? line.variant.priceCents;
          return (
            <span key={line.variant.variantId} className={lineStyle}>
              <span className={lineNameStyle}>
                <span>
                  {line.quantity} × {line.variant.productName}
                </span>
                <span className={metaStyle}>
                  {[line.variant.isDefault ? null : line.variant.variantName, line.variant.sku]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </span>
              <span>{formatPaisa(charged * line.quantity)}</span>
            </span>
          );
        })}

        <div className={totalsStyle}>
          <span className={lineStyle}>
            <span>Subtotal</span>
            <span>{formatPaisa(totals.subtotalCents)}</span>
          </span>
          {/* Shown only when something was actually given away. */}
          {totals.discountCents > 0 && (
            <span className={lineStyle}>
              <span>Discount</span>
              <span>−{formatPaisa(totals.discountCents)}</span>
            </span>
          )}
          <span className={lineStyle}>
            <span>GST 3%</span>
            <span>{formatPaisa(totals.taxCents)}</span>
          </span>
        </div>

        <span className={grandStyle}>
          <span>Total</span>
          <span>{formatPaisa(totals.grandTotalCents)}</span>
        </span>
      </div>

      <div className={payPanelStyle}>
        {method === "UPI" ? (
          <>
            <UpiQrCode
              payee={payee}
              amountCents={totals.grandTotalCents}
              note={`LavIndia ${reference}`}
              reference={reference}
            />
            <p className={stepStyle}>
              Show this to the customer. The amount is already filled in, so
              they cannot pay the wrong figure. Confirm only once their app
              shows the payment as successful.
            </p>
          </>
        ) : (
          <p className={stepStyle}>
            Collect {formatPaisa(totals.grandTotalCents)} by{" "}
            {method === "CASH" ? "cash" : method === "CARD" ? "card" : "the agreed method"}, then
            confirm below.
          </p>
        )}

        <div className={actionsStyle}>
          <Button size="lg" onClick={onConfirm} disabled={submitting}>
            {submitting ? (
              <Loader2
                className={css({ height: "4", width: "4", animation: "spin 1s linear infinite" })}
              />
            ) : (
              <Check className={css({ height: "4", width: "4" })} />
            )}
            Payment received
          </Button>
          <Button variant="outline" onClick={onBack} disabled={submitting}>
            <ArrowLeft className={css({ height: "4", width: "4" })} />
            Back to the sale
          </Button>
        </div>

        <p className={stepStyle}>
          Nothing is recorded until you confirm — no stock movement and no
          invoice number.
        </p>
      </div>
    </div>
  );
}
