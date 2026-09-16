import { css } from "styled-system/css";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IndianRupee, ShoppingCart, Users } from "lucide-react";

interface AnalyticsCardsProps {
  totalRevenue: number;
  ordersCount: number;
  customersCount: number;
}

const cardHeaderRow = css({
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "2",
  paddingBottom: "2",
});

const cardTitleStyle = css({ fontSize: "sm", fontWeight: "medium" });
const iconStyle = css({ height: "4", width: "4", color: "fg.muted" });
const statValue = css({ fontFamily: "display", fontSize: "2xl", fontWeight: "bold", color: "fg.default" });
const statCaption = css({ fontSize: "xs", color: "fg.muted", marginTop: "1" });

export function AnalyticsCards({
  totalRevenue,
  ordersCount,
  customersCount,
}: AnalyticsCardsProps) {
  const formatPrice = (cents: number) => {
    return `₹${(cents / 100).toLocaleString("en-IN")}`;
  };

  return (
    <div className={css({ display: "grid", gap: "4", gridTemplateColumns: "1fr", md: { gridTemplateColumns: "repeat(3, 1fr)" } })}>
      <Card>
        <CardHeader className={cardHeaderRow}>
          <CardTitle className={cardTitleStyle}>Total Revenue</CardTitle>
          <IndianRupee className={iconStyle} />
        </CardHeader>
        <CardContent>
          <div className={statValue}>{formatPrice(totalRevenue)}</div>
          <p className={statCaption}>All time</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className={cardHeaderRow}>
          <CardTitle className={cardTitleStyle}>Orders (30 days)</CardTitle>
          <ShoppingCart className={iconStyle} />
        </CardHeader>
        <CardContent>
          <div className={statValue}>{ordersCount}</div>
          <p className={statCaption}>Last 30 days</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className={cardHeaderRow}>
          <CardTitle className={cardTitleStyle}>New Customers</CardTitle>
          <Users className={iconStyle} />
        </CardHeader>
        <CardContent>
          <div className={statValue}>{customersCount}</div>
          <p className={statCaption}>Last 30 days</p>
        </CardContent>
      </Card>
    </div>
  );
}
