import { css, cx } from "styled-system/css";
import { formatPaisa } from "@/modules/_shared/money";
import type { AccountingSummary } from "@/modules/accounting";

/**
 * From list price to what clients paid, line by line.
 *
 * Every figure the accounting screen shows comes from this one statement, so
 * it is laid out the way an accountant reads it: what the goods were listed
 * at, what was taken off, what the shop actually sold them for before GST,
 * and what was added on top. The last line is what clients paid — the same
 * figure the Dashboard calls sales.
 *
 * Adjustments that did not happen in the period (no cash-on-delivery charges,
 * no GST inside prices) are left out rather than printed as a row of zeros.
 */

const listStyle = css({ display: "flex", flexDirection: "column" });
const rowStyle = css({
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
  gap: "3",
  paddingY: "2",
  fontSize: "sm",
  color: "fg.default",
  borderBottom: "1px solid",
  borderColor: "border.subtle",
  _last: { borderBottom: "none" },
});
const subtotalStyle = css({ fontWeight: "semibold" });
const totalStyle = css({
  fontWeight: "semibold",
  fontSize: "md",
  color: "accent.pressed",
  borderTop: "1px solid",
  borderTopColor: "accent.default",
});
const labelStyle = css({ display: "flex", flexDirection: "column", gap: "0.5", minWidth: 0 });
const hintStyle = css({ fontSize: "xs", color: "fg.muted", fontWeight: "normal" });
const valueStyle = css({ fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" });

interface Line {
  label: string;
  hint?: string;
  cents: number;
  sign?: "+" | "−";
  kind?: "subtotal" | "total";
  /** Shown even when zero — the statement's spine. */
  always?: boolean;
}

function statementLines(summary: AccountingSummary): Line[] {
  return [
    {
      label: "Gross sales at list price",
      hint: "Before any discount",
      cents: summary.grossSalesCents,
      always: true,
    },
    { label: "Offers", hint: "Offers and coupons", cents: summary.offerDiscountsCents, sign: "−" },
    {
      label: "Manual discounts",
      hint: "Price overrides and counter discounts",
      cents: summary.manualDiscountsCents,
      sign: "−",
    },
    {
      label: "GST inside the prices",
      hint: "Moved out of sales; counted under GST below",
      cents: summary.gstInsidePricesCents,
      sign: "−",
    },
    {
      label: "Net sales",
      hint: "What the goods sold for, before GST",
      cents: summary.netSalesCents,
      kind: "subtotal",
      always: true,
    },
    {
      label: "GST collected",
      hint: "Held for the government, not income",
      cents: summary.taxCollectedCents,
      sign: "+",
      always: true,
    },
    { label: "Delivery charges", cents: summary.shippingCents, sign: "+" },
    { label: "Cash-on-delivery charges", cents: summary.codFeeCents, sign: "+" },
    {
      label: "Total collected",
      hint: "What clients paid",
      cents: summary.collectedCents,
      kind: "total",
      always: true,
    },
  ];
}

export function SalesStatement({ summary }: { summary: AccountingSummary }) {
  const lines = statementLines(summary).filter((line) => line.always || line.cents !== 0);

  return (
    <div className={listStyle}>
      {lines.map((line) => (
        <div
          key={line.label}
          className={cx(
            rowStyle,
            line.kind === "subtotal" && subtotalStyle,
            line.kind === "total" && totalStyle,
          )}
        >
          <span className={labelStyle}>
            <span>{line.label}</span>
            {line.hint && <span className={hintStyle}>{line.hint}</span>}
          </span>
          <span className={valueStyle}>
            {line.sign && line.cents !== 0 ? `${line.sign} ` : ""}
            {formatPaisa(line.cents)}
          </span>
        </div>
      ))}
    </div>
  );
}
