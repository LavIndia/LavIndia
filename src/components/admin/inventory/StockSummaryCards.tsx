import Link from "next/link";
import { InfoHint } from "@/components/ui/info-hint";
import { css } from "styled-system/css";

/**
 * The headline numbers above the stock table.
 *
 * Each card states WHAT IT COUNTS underneath the figure, because the four do
 * not measure the same thing: the first counts physical units, the other
 * three count product lines. Four bare numbers side by side invited the
 * reader to add them together, which would be meaningless.
 *
 * Low and out-of-stock are links, not just figures: seeing "2 low" is only
 * useful if the next click shows which two. Units on hand and In stock are
 * context, so they stay quiet.
 */
const gridStyle = css({
  display: "grid",
  gridTemplateColumns: { base: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" },
  gap: "3",
});

const baseCard = {
  display: "flex",
  flexDirection: "column",
  gap: "1",
  padding: "4",
  borderRadius: "md",
  border: "1px solid",
  borderColor: "border.subtle",
  background: "bg.surface",
} as const;

const cardStyle = css(baseCard);
const linkCardStyle = css({
  ...baseCard,
  transition: "border-color 0.15s ease",
  "&:hover": { borderColor: "accent.pressed" },
});

const labelStyle = css({
  display: "flex",
  alignItems: "center",
  fontSize: "xs",
  fontWeight: "medium",
  letterSpacing: "wide",
  textTransform: "uppercase",
  color: "fg.muted",
});

const valueStyle = css({
  fontFamily: "display",
  fontSize: "2xl",
  fontWeight: "semibold",
  fontVariantNumeric: "tabular-nums",
  color: "fg.default",
  lineHeight: "tight",
});

const alertValueStyle = css({
  fontFamily: "display",
  fontSize: "2xl",
  fontWeight: "semibold",
  fontVariantNumeric: "tabular-nums",
  color: "red.600",
  lineHeight: "tight",
});

/** Says what the figure above it counts, so the unit is never guessed at. */
const captionStyle = css({ fontSize: "xs", color: "fg.subtle" });

/**
 * The industry term for one sellable item is a SKU, so that is what the cards
 * say. A necklace in three chain lengths is three SKUs.
 */
function skus(count: number) {
  return count === 1 ? "SKU" : "SKUs";
}

export function StockSummaryCards({
  summary,
}: {
  summary: { inStock: number; lowStock: number; outOfStock: number; totalUnits: number };
}) {
  const format = (value: number) => value.toLocaleString("en-IN");
  const totalLines = summary.inStock + summary.lowStock + summary.outOfStock;

  return (
    <div className={gridStyle}>
      <div className={cardStyle}>
        <span className={labelStyle}>
          Units on hand
          <InfoHint label="About units on hand" below>
            Individual physical pieces, counted across every product and
            location — the number you would reach if you counted the whole
            shop. This is the only card that counts pieces; the other three
            count SKUs, so adding them together means nothing.
          </InfoHint>
        </span>
        <span className={valueStyle}>{format(summary.totalUnits)}</span>
        <span className={captionStyle}>pieces in total</span>
      </div>

      <div className={cardStyle}>
        <span className={labelStyle}>
          In stock
          <InfoHint label="About in stock" below>
            SKUs with more than three pieces available to sell. A SKU is one
            sellable option — a necklace offered in three chain lengths is
            three SKUs, not one.
          </InfoHint>
        </span>
        <span className={valueStyle}>{format(summary.inStock)}</span>
        <span className={captionStyle}>
          of {format(totalLines)} {skus(totalLines)}
        </span>
      </div>

      <Link href="/admin/inventory/stock?status=LOW_STOCK" className={linkCardStyle}>
        <span className={labelStyle}>
          Low stock
          <InfoHint label="About low stock" below>
            SKUs with one to three pieces available. Worth reordering before
            they run out — these are still sellable today. Click the card to
            see exactly which.
          </InfoHint>
        </span>
        <span className={summary.lowStock > 0 ? alertValueStyle : valueStyle}>
          {format(summary.lowStock)}
        </span>
        <span className={captionStyle}>{skus(summary.lowStock)} · 1–3 left</span>
      </Link>

      <Link href="/admin/inventory/stock?status=OUT_OF_STOCK" className={linkCardStyle}>
        <span className={labelStyle}>
          Out of stock
          <InfoHint label="About out of stock" below>
            SKUs with nothing available to sell. They stay visible on the
            storefront but cannot be bought until stock is received. Click the
            card to see exactly which.
          </InfoHint>
        </span>
        <span className={summary.outOfStock > 0 ? alertValueStyle : valueStyle}>
          {format(summary.outOfStock)}
        </span>
        <span className={captionStyle}>{skus(summary.outOfStock)} · none left</span>
      </Link>
    </div>
  );
}
