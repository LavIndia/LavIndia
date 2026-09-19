import Link from "next/link";
import {
  Globe,
  IndianRupee,
  Package,
  ReceiptIndianRupee,
  ShoppingBag,
  Store,
  TriangleAlert,
} from "lucide-react";
import { css } from "styled-system/css";
import { Button } from "@/components/ui/button";
import { formatPaisa, formatPaisaCompact } from "@/modules/_shared/money";
import { getSalesInsights } from "@/modules/analytics/sales-insights";
import { AdminPageHeader } from "@/components/admin/shared/AdminPageHeader";
import { PeriodPicker } from "@/components/admin/insights/PeriodPicker";
import {
  InsightCard,
  InsightCardGrid,
  InsightPanel,
  RankedList,
} from "@/components/admin/insights/InsightCards";
import {
  LowStockTable,
  StockLink,
  TopProductsTable,
} from "@/components/admin/insights/TopProductsTable";
import { DailyTrend } from "@/components/admin/insights/DailyTrend";

const pageStyle = css({ display: "flex", flexDirection: "column", gap: "5" });
const twoUpStyle = css({
  display: "grid",
  gap: "4",
  gridTemplateColumns: { base: "1fr", xl: "3fr 2fr" },
});
const threeUpStyle = css({
  display: "grid",
  gap: "4",
  gridTemplateColumns: { base: "1fr", md: "repeat(3, 1fr)" },
  // Each panel is as tall as its own content; without this the two short
  // channel panels stretch to match the payment list beside them.
  alignItems: "start",
});
const noticeStyle = css({
  display: "flex",
  alignItems: "center",
  gap: "2",
  borderRadius: "lg",
  border: "1px solid",
  borderColor: "border.subtle",
  background: "bg.surface",
  padding: "3",
  fontSize: "sm",
  color: "fg.muted",
});
const noticeIconStyle = css({ height: "4", width: "4", color: "danger", flexShrink: 0 });
const actionsStyle = css({ display: "flex", gap: "2", flexWrap: "wrap" });
const iconStyle = css({ height: "4", width: "4" });

/**
 * What the shop is doing — both channels, one page.
 *
 * Every figure is computed by the database in `src/modules/analytics`, so
 * this file only arranges them. The period chips at the top govern the whole
 * page rather than each panel having its own control, because the commonest
 * question is "how did this week go" and the answer should not need six
 * separate adjustments.
 */
export default async function SalesInsightsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { period: requested } = await searchParams;
  const insights = await getSalesInsights(requested ?? "30d");
  const { totals, channels, period } = insights;

  const store = channels.find((channel) => channel.source === "STORE");
  const online = channels.find((channel) => channel.source === "ONLINE");
  const share = (value: number) =>
    totals.revenueCents > 0 ? `${Math.round((value / totals.revenueCents) * 100)}% of takings` : "—";

  return (
    <div className={pageStyle}>
      <AdminPageHeader
        title="Sales insights"
        subtitle={`Counter and website together · ${period.label.toLowerCase()}`}
        actions={
          <div className={actionsStyle}>
            <Button variant="outline" asChild>
              <Link href="/admin/pos">
                <Store className={iconStyle} />
                New counter sale
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/admin/orders">
                <ShoppingBag className={iconStyle} />
                All orders
              </Link>
            </Button>
          </div>
        }
      />

      <PeriodPicker active={requested ?? "30d"} />

      <InsightCardGrid>
        <InsightCard
          icon={IndianRupee}
          label="Value of goods sold"
          value={formatPaisa(totals.revenueCents)}
          caption="before shipping and tax"
        />
        <InsightCard
          icon={ShoppingBag}
          label="Orders"
          value={totals.orders.toLocaleString("en-IN")}
          caption={
            totals.orders > 0 ? `${formatPaisa(totals.averageCents)} per order` : "none yet"
          }
        />
        <InsightCard
          icon={Package}
          label="Pieces sold"
          value={totals.pieces.toLocaleString("en-IN")}
          caption="units that left the shelf"
        />
        <InsightCard
          icon={ReceiptIndianRupee}
          label="Average order"
          value={formatPaisa(totals.averageCents)}
          caption="across both channels"
        />
      </InsightCardGrid>

      {/* Stated rather than buried: a settled sale with no bill is a gap in
          the financial-year sequence, not a cosmetic issue. */}
      {insights.missingInvoices > 0 && (
        <p className={noticeStyle}>
          <TriangleAlert className={noticeIconStyle} />
          {insights.missingInvoices === 1
            ? "1 paid order has no invoice."
            : `${insights.missingInvoices} paid orders have no invoice.`}{" "}
          Counter sales always raise one; online orders paid by cash on delivery
          currently do not — see BACKLOG.md #10.
        </p>
      )}

      <div className={threeUpStyle}>
        <InsightPanel title="Walk-in" hint="Sold at the counter">
          <InsightCardGrid>
            <InsightCard
              compact
              icon={Store}
              label="Takings"
              value={formatPaisaCompact(store?.revenueCents ?? 0)}
              caption={share(store?.revenueCents ?? 0)}
            />
            <InsightCard
              compact
              icon={Package}
              label="Pieces"
              value={(store?.pieces ?? 0).toLocaleString("en-IN")}
              caption={`${store?.orders ?? 0} sales`}
            />
          </InsightCardGrid>
        </InsightPanel>

        <InsightPanel title="Online" hint="Placed on the website">
          <InsightCardGrid>
            <InsightCard
              compact
              icon={Globe}
              label="Takings"
              value={formatPaisaCompact(online?.revenueCents ?? 0)}
              caption={share(online?.revenueCents ?? 0)}
            />
            <InsightCard
              compact
              icon={Package}
              label="Pieces"
              value={(online?.pieces ?? 0).toLocaleString("en-IN")}
              caption={`${online?.orders ?? 0} orders`}
            />
          </InsightCardGrid>
        </InsightPanel>

        <InsightPanel title="How they paid" hint="By value">
          <RankedList
            rows={insights.paymentMix}
            emptyMessage="No payments in this period."
          />
        </InsightPanel>
      </div>

      <InsightPanel title="Takings by day" hint="Walk-in and online stacked">
        <DailyTrend days={insights.daily} />
      </InsightPanel>

      <div className={twoUpStyle}>
        <InsightPanel
          title="Best sellers"
          hint="Ranked by pieces sold, with the counter/web split"
        >
          <TopProductsTable products={insights.topProducts} />
        </InsightPanel>

        <InsightPanel title="Categories" hint="By value sold">
          <RankedList
            rows={insights.categories}
            emptyMessage="Nothing sold in this period."
          />
        </InsightPanel>
      </div>

      <div className={twoUpStyle}>
        <InsightPanel
          title="Running low"
          hint="At or below the reorder point — as of now, not the period above"
        >
          <LowStockTable items={insights.lowStock} />
          <StockLink />
        </InsightPanel>

        <InsightPanel title="Best customers" hint="By value, both channels">
          <RankedList
            rows={insights.topCustomers}
            emptyMessage="No customers in this period."
          />
        </InsightPanel>
      </div>
    </div>
  );
}
