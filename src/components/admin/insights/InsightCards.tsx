import type { LucideIcon } from "lucide-react";
import { css } from "styled-system/css";
import { formatPaisa } from "@/modules/_shared/money";

const gridStyle = css({
  display: "grid",
  gap: "3",
  gridTemplateColumns: { base: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" },
});
const cardStyle = css({
  borderRadius: "xl",
  border: "1px solid",
  borderColor: "border.subtle",
  background: "bg.surface",
  boxShadow: "card",
  padding: "4",
  display: "flex",
  flexDirection: "column",
  gap: "1",
  minWidth: 0,
});
const labelStyle = css({
  display: "flex",
  alignItems: "center",
  gap: "1.5",
  fontSize: "xs",
  fontWeight: "medium",
  color: "fg.muted",
});
const iconStyle = css({ height: "3.5", width: "3.5" });
const valueStyle = css({
  fontFamily: "display",
  fontSize: { base: "xl", lg: "2xl" },
  fontWeight: "semibold",
  color: "fg.default",
  fontVariantNumeric: "tabular-nums",
  lineHeight: 1.2,
});
const captionStyle = css({ fontSize: "xs", color: "fg.muted" });
/** For cards nested inside a panel, where the column is half the width. */
const compactValueStyle = css({
  fontFamily: "display",
  fontSize: { base: "lg", lg: "xl" },
  fontWeight: "semibold",
  color: "fg.default",
  fontVariantNumeric: "tabular-nums",
  lineHeight: 1.2,
  // A figure is never broken across lines — "₹21,289." above "00" is worse
  // than a smaller number. These cards drop the paise instead, which is what
  // keeps them inside a half-width column.
  whiteSpace: "nowrap",
});

export function InsightCardGrid({ children }: { children: React.ReactNode }) {
  return <div className={gridStyle}>{children}</div>;
}

/** One headline figure, with the caption that stops it being misread. */
export function InsightCard({
  icon: Icon,
  label,
  value,
  caption,
  compact,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  caption?: string;
  /** Set when the card sits inside a panel rather than across the page. */
  compact?: boolean;
}) {
  return (
    <div className={cardStyle}>
      <span className={labelStyle}>
        <Icon className={iconStyle} />
        {label}
      </span>
      <span className={compact ? compactValueStyle : valueStyle}>{value}</span>
      {caption && <span className={captionStyle}>{caption}</span>}
    </div>
  );
}

const panelStyle = css({
  borderRadius: "xl",
  border: "1px solid",
  borderColor: "border.subtle",
  background: "bg.surface",
  boxShadow: "card",
  padding: "4",
  display: "flex",
  flexDirection: "column",
  gap: "3",
  minWidth: 0,
});
const panelTitleStyle = css({
  fontFamily: "display",
  fontSize: "md",
  fontWeight: "semibold",
  color: "fg.default",
});
const panelHintStyle = css({ fontSize: "xs", color: "fg.muted", marginTop: "0.5" });

export function InsightPanel({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={panelStyle}>
      <div>
        <h2 className={panelTitleStyle}>{title}</h2>
        {hint && <p className={panelHintStyle}>{hint}</p>}
      </div>
      {children}
    </section>
  );
}

const rowStyle = css({ display: "flex", flexDirection: "column", gap: "1" });
const rowTopStyle = css({
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
  gap: "3",
});
const rowNameStyle = css({
  fontSize: "sm",
  color: "fg.default",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});
const rowValueStyle = css({
  fontSize: "sm",
  fontWeight: "medium",
  fontVariantNumeric: "tabular-nums",
  whiteSpace: "nowrap",
});
const trackStyle = css({
  height: "1.5",
  borderRadius: "full",
  background: "bg.canvas",
  overflow: "hidden",
});
const fillStyle = css({ height: "full", borderRadius: "full", background: "accent.default" });
const listStyle = css({ display: "flex", flexDirection: "column", gap: "3" });
const emptyStyle = css({ fontSize: "sm", color: "fg.muted", paddingBlock: "4" });

/**
 * A ranked breakdown — categories, payment methods, customers.
 *
 * The bar is scaled against the largest row rather than the total, so the
 * shape of the ranking stays readable when one entry dominates; the number
 * beside it is the actual figure, which is what anyone reads first anyway.
 */
export function RankedList({
  rows,
  emptyMessage,
}: {
  rows: Array<{ name: string; revenueCents: number; orders: number }>;
  emptyMessage: string;
}) {
  if (rows.length === 0) return <p className={emptyStyle}>{emptyMessage}</p>;

  const largest = Math.max(...rows.map((row) => row.revenueCents), 1);

  return (
    <div className={listStyle}>
      {rows.map((row) => (
        <div key={row.name} className={rowStyle}>
          <div className={rowTopStyle}>
            <span className={rowNameStyle} title={row.name}>
              {row.name}
            </span>
            <span className={rowValueStyle}>{formatPaisa(row.revenueCents)}</span>
          </div>
          <div className={trackStyle}>
            <div
              className={fillStyle}
              style={{ width: `${Math.max((row.revenueCents / largest) * 100, 2)}%` }}
            />
          </div>
          <span className={captionStyle}>
            {row.orders === 1 ? "1 order" : `${row.orders} orders`}
          </span>
        </div>
      ))}
    </div>
  );
}
