"use client";

import { Sparkles } from "lucide-react";
import { css } from "styled-system/css";
import { formatPaisa } from "@/modules/_shared/money";
import type { CheckoutQuote } from "./useCheckoutQuote";

const listStyle = css({
  display: "flex",
  flexDirection: "column",
  gap: "2",
  borderTop: "1px solid",
  borderColor: "border.subtle",
  paddingTop: "4",
  marginTop: "4",
});
const rowStyle = css({ display: "flex", justifyContent: "space-between", gap: "3", fontSize: "sm" });
const labelStyle = css({ color: "fg.muted", minWidth: 0 });
const valueStyle = css({ fontVariantNumeric: "tabular-nums", color: "fg.default", flexShrink: 0 });
const savingStyle = css({ fontVariantNumeric: "tabular-nums", color: "success", flexShrink: 0 });
const grandStyle = css({
  display: "flex",
  justifyContent: "space-between",
  borderTop: "1px solid",
  borderColor: "border.subtle",
  paddingTop: "3",
  marginTop: "1",
  fontFamily: "display",
  fontSize: "lg",
  fontWeight: "semibold",
  color: "fg.default",
});
const nudgeStyle = css({
  display: "flex",
  alignItems: "flex-start",
  gap: "2",
  borderRadius: "lg",
  background: "gold.50",
  border: "1px solid",
  borderColor: "gold.200",
  color: "gold.700",
  padding: "2.5",
  fontSize: "sm",
  _dark: { background: "bg.surface", color: "gold.200", borderColor: "gold.700" },
});
const iconStyle = css({ width: "4", height: "4", flexShrink: 0, marginTop: "0.5" });
const noteStyle = css({ fontSize: "xs", color: "fg.muted", textAlign: "right" });

/**
 * The order total as it will be charged, with each offer named, the next
 * offer within reach, and GST shown the way the prices carry it.
 */
export function CheckoutTotals({ quote, loading }: { quote: CheckoutQuote | null; loading: boolean }) {
  if (!quote) {
    return (
      <div className={listStyle}>
        <p className={labelStyle}>{loading ? "Working out your total…" : "Your bag is empty"}</p>
      </div>
    );
  }

  const { totals } = quote;
  const manualDiscount = totals.discountCents - totals.promotionDiscountCents;
  const pieceAndOrderOffers = quote.applied.filter(
    (offer) => offer.savingCents > 0 && !(totals.deliveryDiscountCents > 0 && offer.savingCents === totals.deliveryDiscountCents),
  );

  return (
    <div className={listStyle} aria-busy={loading}>
      {quote.nudges.slice(0, 2).map((nudge) => (
        <div key={nudge.promotionId} className={nudgeStyle}>
          <Sparkles className={iconStyle} aria-hidden />
          <span>{nudge.text}</span>
        </div>
      ))}

      <div className={rowStyle}>
        <span className={labelStyle}>Subtotal</span>
        <span className={valueStyle}>{formatPaisa(totals.subtotalCents)}</span>
      </div>
      {pieceAndOrderOffers.map((offer) => (
        <div key={offer.promotionId} className={rowStyle}>
          <span className={labelStyle}>{offer.code ? `${offer.label} · ${offer.code}` : offer.label}</span>
          <span className={savingStyle}>−{formatPaisa(offer.savingCents)}</span>
        </div>
      ))}
      {manualDiscount > 0 && (
        <div className={rowStyle}>
          <span className={labelStyle}>Discount</span>
          <span className={savingStyle}>−{formatPaisa(manualDiscount)}</span>
        </div>
      )}
      <div className={rowStyle}>
        <span className={labelStyle}>Shipping</span>
        <span className={totals.shippingCents === 0 ? savingStyle : valueStyle}>
          {totals.shippingCents === 0 ? "Free" : formatPaisa(totals.shippingCents)}
        </span>
      </div>
      {quote.codFeeCents > 0 && (
        <div className={rowStyle}>
          <span className={labelStyle}>Cash on delivery fee</span>
          <span className={valueStyle}>{formatPaisa(quote.codFeeCents)}</span>
        </div>
      )}
      {totals.taxCents > 0 && !totals.taxIncluded && (
        <div className={rowStyle}>
          <span className={labelStyle}>GST</span>
          <span className={valueStyle}>{formatPaisa(totals.taxCents)}</span>
        </div>
      )}
      <div className={grandStyle}>
        <span>Total</span>
        <span>{formatPaisa(quote.payableCents)}</span>
      </div>
      {totals.taxIncluded && totals.taxCents > 0 && (
        <p className={noteStyle}>Includes {formatPaisa(totals.taxCents)} GST</p>
      )}
    </div>
  );
}
