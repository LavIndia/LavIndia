import { Store, Globe, ReceiptIndianRupee, ShoppingBag } from "lucide-react";
import { css } from "styled-system/css";
import { formatRupees } from "./OrderBadges";
import type { OrdersSummary } from "./order-types";

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
const labelRowStyle = css({
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

/**
 * What the filtered list adds up to.
 *
 * These describe the orders ON SCREEN, not the business as a whole — narrow
 * the list to walk-in sales in the last 7 days and these four numbers answer
 * "how did the shop do this week" without anyone opening a spreadsheet.
 *
 * Computed by the page in a single grouped query rather than by summing the
 * rows here, so the totals stay correct once the list is paginated.
 */
export function OrdersSummaryCards({ summary }: { summary: OrdersSummary }) {
  const { orderCount, revenueCents, storeCount, onlineCount } = summary;
  const average = orderCount > 0 ? Math.round(revenueCents / orderCount) : 0;

  return (
    <div className={gridStyle}>
      <div className={cardStyle}>
        <span className={labelRowStyle}>
          <ShoppingBag className={iconStyle} />
          Orders
        </span>
        <span className={valueStyle}>{orderCount.toLocaleString("en-IN")}</span>
        <span className={captionStyle}>matching these filters</span>
      </div>

      <div className={cardStyle}>
        <span className={labelRowStyle}>
          <ReceiptIndianRupee className={iconStyle} />
          Value of goods
        </span>
        <span className={valueStyle}>{formatRupees(revenueCents)}</span>
        <span className={captionStyle}>
          {orderCount > 0 ? `${formatRupees(average)} per order` : "before shipping and tax"}
        </span>
      </div>

      <div className={cardStyle}>
        <span className={labelRowStyle}>
          <Store className={iconStyle} />
          Walk-in
        </span>
        <span className={valueStyle}>{storeCount.toLocaleString("en-IN")}</span>
        <span className={captionStyle}>sold at the counter</span>
      </div>

      <div className={cardStyle}>
        <span className={labelRowStyle}>
          <Globe className={iconStyle} />
          Online
        </span>
        <span className={valueStyle}>{onlineCount.toLocaleString("en-IN")}</span>
        <span className={captionStyle}>placed on the website</span>
      </div>
    </div>
  );
}
