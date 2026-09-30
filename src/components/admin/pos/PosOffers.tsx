"use client";

import { useState } from "react";
import { Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { css } from "styled-system/css";
import { formatPaisa } from "@/modules/_shared/money";
import type { PosQuote } from "./usePosQuote";

const row = css({ display: "flex", justifyContent: "space-between", gap: "3", fontSize: "sm", color: "fg.muted", fontVariantNumeric: "tabular-nums" });
const saving = css({ color: "success", fontVariantNumeric: "tabular-nums", flexShrink: 0 });
const grand = css({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "baseline",
  fontFamily: "display",
  fontSize: "2xl",
  fontWeight: "semibold",
  fontVariantNumeric: "lining-nums tabular-nums",
  paddingTop: "2",
  borderTop: "1px solid",
  borderColor: "border.subtle",
});
const nudge = css({
  display: "flex",
  gap: "2",
  alignItems: "flex-start",
  fontSize: "sm",
  borderRadius: "md",
  background: "gold.50",
  border: "1px solid",
  borderColor: "gold.200",
  color: "gold.700",
  padding: "2",
  _dark: { background: "bg.canvas", color: "gold.200", borderColor: "gold.700" },
});
const chip = css({ display: "inline-flex", alignItems: "center", gap: "1", fontFamily: "mono", fontSize: "xs", borderRadius: "full", border: "1px solid", borderColor: "gold.200", paddingInline: "2", paddingBlock: "0.5" });

export interface PosFallbackTotals {
  subtotalCents: number;
  discountCents: number;
  taxCents: number;
  grandTotalCents: number;
  itemCount: number;
}

/**
 * The counter's totals, offers and codes. Figures come from the same pricing
 * the sale is charged with; until the first answer arrives, the basket's own
 * estimate is shown so scanning never feels slow.
 */
export function PosOffers({
  quote,
  loading,
  fallback,
  codes,
  onCodesChange,
}: {
  quote: PosQuote | null;
  loading: boolean;
  fallback: PosFallbackTotals;
  codes: string[];
  onCodesChange: (codes: string[]) => void;
}) {
  const [text, setText] = useState("");
  const t = quote?.totals;
  const manual = t ? t.discountCents - t.promotionDiscountCents : fallback.discountCents;
  const add = () => {
    const code = text.trim().toUpperCase();
    if (code && !codes.includes(code)) onCodesChange([...codes, code]);
    setText("");
  };

  return (
    <div className={css({ display: "flex", flexDirection: "column", gap: "2" })} aria-busy={loading}>
      {quote?.nudges.slice(0, 2).map((n) => (
        <div key={n.promotionId} className={nudge}>
          <Sparkles className={css({ width: "4", height: "4", flexShrink: 0, marginTop: "0.5" })} aria-hidden />
          <span>{n.text}</span>
        </div>
      ))}

      <div className={row}>
        <span>{fallback.itemCount} item{fallback.itemCount === 1 ? "" : "s"}</span>
        <span>{formatPaisa(t?.subtotalCents ?? fallback.subtotalCents)}</span>
      </div>
      {quote?.applied.map((a) => (
        <div key={a.promotionId} className={row}>
          <span>{a.code ? `${a.label} · ${a.code}` : a.label}</span>
          <span className={saving}>−{formatPaisa(a.savingCents)}</span>
        </div>
      ))}
      {manual > 0 && (
        <div className={row}>
          <span>Price changes</span>
          <span className={saving}>−{formatPaisa(manual)}</span>
        </div>
      )}
      <div className={row}>
        <span>{t?.taxIncluded ? "GST included" : "GST"}</span>
        <span>{formatPaisa(t?.taxCents ?? fallback.taxCents)}</span>
      </div>
      <div className={grand}>
        <span>Total</span>
        <span>{formatPaisa(t?.grandTotalCents ?? fallback.grandTotalCents)}</span>
      </div>

      {/* Typed quickly, a code looks like a scan to the page-wide scanner;
          this box owns its own keystrokes. */}
      <div className={css({ display: "flex", gap: "2", marginTop: "1" })} data-scan-owner="offer-code">
        <Input
          id="pos-code"
          aria-label="Offer code"
          placeholder="Offer code"
          value={text}
          onChange={(e) => setText(e.target.value.toUpperCase())}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <Button type="button" variant="outline" onClick={add} disabled={!text.trim()}>
          Apply
        </Button>
      </div>
      {codes.length > 0 && (
        <div className={css({ display: "flex", flexWrap: "wrap", gap: "2" })}>
          {codes.map((code) => (
            <span key={code} className={chip}>
              {code}
              <button type="button" aria-label={`Remove code ${code}`} className={css({ cursor: "pointer", display: "inline-flex" })} onClick={() => onCodesChange(codes.filter((c) => c !== code))}>
                <X className={css({ width: "3", height: "3" })} />
              </button>
            </span>
          ))}
        </div>
      )}
      {quote?.codeProblems.map((p) => (
        <span key={p.code} className={css({ fontSize: "sm", color: "danger" })}>
          {p.code}: {p.text}
        </span>
      ))}
    </div>
  );
}
