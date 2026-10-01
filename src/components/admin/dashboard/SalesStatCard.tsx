import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IndianRupee, TrendingDown, TrendingUp } from "lucide-react";
import { css, cx } from "styled-system/css";

const cardStyle = css({ borderRadius: "xl" });
const headerStyle = css({
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingBottom: "2",
});
const labelStyle = css({ fontSize: "sm", fontWeight: "medium", color: "fg.muted" });
const iconStyle = css({ height: "4", width: "4", color: "fg.muted" });
const valueStyle = css({
  fontSize: "2xl",
  fontWeight: "bold",
  color: "fg.default",
  fontVariantNumeric: "tabular-nums",
});
const trendRowStyle = css({
  marginTop: "1",
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap",
  columnGap: "1",
  fontSize: "xs",
  color: "fg.muted",
});
const trendIconStyle = css({ height: "3", width: "3" });
const upStyle = css({ color: "success" });
const downStyle = css({ color: "danger" });
const captionStyle = css({ marginTop: "1", fontSize: "xs", color: "fg.muted" });

const rupees = (cents: number) =>
  `₹${Math.round(cents / 100).toLocaleString("en-IN")}`;

/**
 * Sales this month so far, set against the same days of last month, with the
 * all-time figure beneath. Every amount is what clients actually paid.
 */
export function SalesStatCard({
  monthSalesCents,
  monthChangePct,
  comparedWith,
  allTimeSalesCents,
}: {
  monthSalesCents: number;
  monthChangePct: number | null;
  comparedWith: string;
  allTimeSalesCents: number;
}) {
  const up = (monthChangePct ?? 0) >= 0;
  const TrendIcon = up ? TrendingUp : TrendingDown;

  return (
    <Card className={cardStyle}>
      <CardHeader className={headerStyle}>
        <CardTitle className={labelStyle}>Sales this month</CardTitle>
        <IndianRupee className={iconStyle} />
      </CardHeader>
      <CardContent>
        <div className={valueStyle}>{rupees(monthSalesCents)}</div>
        <div className={trendRowStyle}>
          {monthChangePct === null ? (
            <span>No sales in {comparedWith} to compare with</span>
          ) : (
            <>
              <TrendIcon className={cx(trendIconStyle, up ? upStyle : downStyle)} />
              <span className={up ? upStyle : downStyle}>
                {up ? "+" : ""}
                {monthChangePct.toFixed(1)}%
              </span>
              <span>vs {comparedWith}</span>
            </>
          )}
        </div>
        <p className={captionStyle}>{rupees(allTimeSalesCents)} all time</p>
      </CardContent>
    </Card>
  );
}
