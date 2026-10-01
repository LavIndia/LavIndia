import { SALE_STATUSES, orderPaidCents } from "@/modules/analytics/paid-amount";
import type { OrdersSummary } from "./order-types";

/** One group of the Orders screen's totals query. */
export interface OrdersSummaryGroup {
  source: "ONLINE" | "STORE";
  status: string;
  taxIncluded: boolean;
  _count: { _all: number };
  _sum: {
    totalCents: number | null;
    discountCents: number | null;
    shippingCents: number | null;
    codFeeCents: number | null;
    taxCents: number | null;
  };
}

const SALES = new Set<string>(SALE_STATUSES);

/**
 * The grouped totals → the summary cards.
 *
 * Every order matching the filters is counted, but only sales add to what
 * clients paid: a cancelled, refunded or still-unpaid order took no money.
 * Each group shares one `taxIncluded`, so `orderPaidCents` over its sums is
 * exactly the sum of what each of its orders paid.
 */
export function summarise(groups: OrdersSummaryGroup[]): OrdersSummary {
  const summary: OrdersSummary = {
    orderCount: 0,
    saleCount: 0,
    paidCents: 0,
    storeCount: 0,
    onlineCount: 0,
  };

  for (const group of groups) {
    const count = group._count._all;
    summary.orderCount += count;
    if (group.source === "STORE") summary.storeCount += count;
    else summary.onlineCount += count;

    if (!SALES.has(group.status)) continue;
    summary.saleCount += count;
    summary.paidCents += orderPaidCents({
      totalCents: group._sum.totalCents ?? 0,
      discountCents: group._sum.discountCents ?? 0,
      shippingCents: group._sum.shippingCents ?? 0,
      codFeeCents: group._sum.codFeeCents ?? 0,
      taxCents: group._sum.taxCents ?? 0,
      taxIncluded: group.taxIncluded,
    });
  }

  return summary;
}
