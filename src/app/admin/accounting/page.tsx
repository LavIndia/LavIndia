import {
  Banknote,
  Boxes,
  IndianRupee,
  Percent,
  ReceiptIndianRupee,
  Handshake,
  Tag,
  TrendingUp,
  Truck,
} from "lucide-react";
import { css } from "styled-system/css";
import { formatPaisa } from "@/modules/_shared/money";
import { accountingService } from "@/modules/accounting";
import { supplierService } from "@/modules/purchasing";
import { resolvePeriod } from "@/modules/analytics/insight-periods";
import { AdminPageHeader } from "@/components/admin/shared/AdminPageHeader";
import { PeriodPicker } from "@/components/admin/insights/PeriodPicker";
import { InsightCard, InsightCardGrid, InsightPanel } from "@/components/admin/insights/InsightCards";
import {
  ProductMarginTable,
  SupplierSpendTable,
} from "@/components/admin/accounting/AccountingTables";

/**
 * The accounting screen.
 *
 * Sales Insights answers "how is the shop trading". This answers "what did
 * the shop make", which is a different question with different rules: only
 * settled money counts, cost is measured against what each piece cost when
 * it sold, and any figure built from incomplete data says so on its face.
 */

export const metadata = { title: "Accounting" };

const pageStyle = css({ display: "flex", flexDirection: "column", gap: "5" });
const twoUpStyle = css({
  display: "grid",
  gap: "4",
  gridTemplateColumns: { base: "1fr", xl: "3fr 2fr" },
  alignItems: "start",
});
const noticeStyle = css({
  fontSize: "sm",
  color: "fg.muted",
  lineHeight: "1.6",
  background: "bg.glass",
  border: "1px solid",
  borderColor: "border.subtle",
  borderRadius: "lg",
  padding: "3",
});

/** "12 of 40 lines" — how much of a total is actually backed by data. */
function coverage(counted: number, missing: number): string | undefined {
  const total = counted + missing;
  if (total === 0 || missing === 0) return undefined;
  return `${counted} of ${total} lines have a cost recorded`;
}

export default async function AccountingPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { period: periodParam } = await searchParams;
  const period = resolvePeriod(periodParam ?? "30d");
  const range = { from: period.from };

  // One round of parallel reads. Each of these is independent, so waiting for
  // them in series would make the page four times slower for no reason.
  const [summary, margins, stock, supplierSpend] = await Promise.all([
    accountingService.summary(range),
    accountingService.productMargins(range),
    accountingService.stockValuation(),
    supplierService.spendBySupplier({
      from: period.from ?? new Date(0),
      to: new Date(),
    }),
  ]);

  const cogsCoverage = coverage(
    summary.costOfGoodsSold.countedLines,
    summary.costOfGoodsSold.missingLines,
  );
  const noCostsAtAll =
    summary.costOfGoodsSold.countedLines === 0 && summary.costOfGoodsSold.missingLines > 0;

  return (
    <div className={pageStyle}>
      <AdminPageHeader
        title="Accounting"
        subtitle="What the shop earned, what the goods cost, and what was spent on stock."
      />

      <PeriodPicker active={periodParam ?? "30d"} basePath="/admin/accounting" />

      {noCostsAtAll && (
        <p className={noticeStyle}>
          No cost prices have been recorded yet, so profit cannot be worked out. Set a cost
          price on a product, or enter what you paid when receiving stock, and these figures
          fill in from then on.
        </p>
      )}

      <InsightCardGrid>
        <InsightCard
          icon={IndianRupee}
          label="Revenue"
          value={formatPaisa(summary.revenueCents)}
          caption={`${summary.orderCount} settled order${summary.orderCount === 1 ? "" : "s"} · ${period.label.toLowerCase()}`}
        />
        <InsightCard
          icon={Boxes}
          label="Cost of goods sold"
          value={formatPaisa(summary.costOfGoodsSold.cents)}
          caption={cogsCoverage ?? `${summary.unitsSold} units sold`}
        />
        <InsightCard
          icon={TrendingUp}
          label="Gross profit"
          value={formatPaisa(summary.grossProfitCents)}
          caption="Revenue less cost, on the lines that have a cost"
        />
        <InsightCard
          icon={Percent}
          label="Gross margin"
          value={summary.grossMarginPercent === null ? "—" : `${summary.grossMarginPercent}%`}
          caption="Share of revenue kept as profit"
        />
      </InsightCardGrid>

      <InsightCardGrid>
        <InsightCard
          icon={ReceiptIndianRupee}
          label="GST collected"
          value={formatPaisa(summary.taxCollectedCents)}
          caption="Held on behalf of the government, not income"
        />
        <InsightCard
          icon={Tag}
          label="Discounts given"
          value={formatPaisa(summary.discountsCents)}
          caption="Across every settled order in the period"
        />
        <InsightCard
          icon={Truck}
          label="Stock purchased"
          value={formatPaisa(summary.purchasesCents.cents)}
          caption={
            coverage(summary.purchasesCents.countedLines, summary.purchasesCents.missingLines) ??
            "Paid to suppliers for stock received"
          }
        />
        <InsightCard
          icon={Banknote}
          label="Stock on hand"
          value={formatPaisa(stock.valuedAtCostCents)}
          caption={
            stock.unvaluedUnits > 0
              ? `${stock.valuedUnits} units valued, ${stock.unvaluedUnits} without a cost`
              : `${stock.valuedUnits} units, valued at cost`
          }
        />
      </InsightCardGrid>

      {/* Shown only once there is a comparison to make. A shop that has never
          recorded an asking price has no saving to report, and an empty tile
          claiming zero would read as "bargaining achieved nothing". */}
      {summary.bargainSavedCents.countedLines > 0 && (
        <InsightCardGrid>
          <InsightCard
            icon={Handshake}
            label="Saved by bargaining"
            value={formatPaisa(summary.bargainSavedCents.cents)}
            caption={
              coverage(
                summary.bargainSavedCents.countedLines,
                summary.bargainSavedCents.missingLines,
              ) ?? "Asking price less what you actually paid"
            }
          />
        </InsightCardGrid>
      )}

      <div className={twoUpStyle}>
        <InsightPanel
          title="Where the profit came from"
          hint="Each product over the period, measured against what it cost when it sold."
        >
          <ProductMarginTable rows={margins} />
        </InsightPanel>

        <InsightPanel
          title="Spend by supplier"
          hint="Stock received in the period, totalled by who it came from."
        >
          <SupplierSpendTable rows={supplierSpend} />
        </InsightPanel>
      </div>
    </div>
  );
}
