/**
 * The books, derived rather than stored.
 *
 * Only settled money is counted. A cancelled order and one still waiting to
 * be paid are not revenue, and counting them would flatter every figure on
 * the page — so the filter that decides what "sold" means lives here, once,
 * and every total on the accounting screen inherits it.
 */
import { Prisma } from "@prisma/client";
import { prisma } from "../_shared/db";
import type {
  AccountingSummary,
  PartialTotal,
  ProductMargin,
  StockValuation,
} from "./contracts";

export interface AccountingRange {
  /** Inclusive lower bound, or null for all time. */
  from: Date | null;
  to?: Date;
}

/** The window as a Prisma filter, or nothing at all for "all time". */
function createdWithin(range: AccountingRange) {
  if (!range.from) return {};
  return { createdAt: { gte: range.from, ...(range.to ? { lte: range.to } : {}) } };
}

/**
 * What counts as a sale.
 *
 * Cancelled and refunded orders are excluded outright: the money went back.
 * Of what remains, an order counts once it has actually been paid for, which
 * is either a completed payment or a cash-on-delivery order that reached the
 * customer. A pending online order is somebody's abandoned checkout, and
 * counting it would flatter every figure on the page.
 */
function soldWhere(range: AccountingRange): Prisma.OrderWhereInput {
  return {
    status: { notIn: ["CANCELLED", "REFUNDED"] },
    OR: [{ paymentStatus: "COMPLETED" }, { status: "DELIVERED" }],
    ...createdWithin(range),
  };
}

function emptyTotal(): PartialTotal {
  return { cents: 0, countedLines: 0, missingLines: 0 };
}

class AccountingService {
  /**
   * The headline figures for a period.
   *
   * Three queries: the order totals, the sold lines, and the purchases. Not
   * one per tile — the same rows answer several questions, so they are
   * fetched once and reduced in memory.
   */
  async summary(range: AccountingRange): Promise<AccountingSummary> {
    const where = soldWhere(range);

    const [orderTotals, lines, purchases] = await Promise.all([
      prisma.order.aggregate({
        where,
        _sum: {
          totalCents: true,
          taxCents: true,
          shippingCents: true,
          discountCents: true,
        },
        _count: { _all: true },
      }),
      prisma.orderItem.findMany({
        where: { order: where },
        select: { quantity: true, priceCents: true, unitCostCents: true },
      }),
      prisma.inventoryMovement.findMany({
        where: { type: "RECEIVE", ...createdWithin(range) },
        select: { quantity: true, unitCostCents: true, listUnitCostCents: true },
      }),
    ]);

    const costOfGoodsSold = emptyTotal();
    let unitsSold = 0;
    let revenueOnCostedLines = 0;

    for (const line of lines) {
      unitsSold += line.quantity;
      if (line.unitCostCents === null) {
        costOfGoodsSold.missingLines += 1;
        continue;
      }
      costOfGoodsSold.countedLines += 1;
      costOfGoodsSold.cents += line.unitCostCents * line.quantity;
      revenueOnCostedLines += line.priceCents * line.quantity;
    }

    const purchasesCents = emptyTotal();
    const bargainSavedCents = emptyTotal();

    for (const movement of purchases) {
      if (movement.unitCostCents === null) purchasesCents.missingLines += 1;
      else {
        purchasesCents.countedLines += 1;
        purchasesCents.cents += movement.unitCostCents * movement.quantity;
      }

      // A saving needs both ends of the comparison. A line with no asking
      // price recorded did not save nothing; it cannot say either way.
      if (movement.listUnitCostCents === null || movement.unitCostCents === null) {
        bargainSavedCents.missingLines += 1;
      } else {
        bargainSavedCents.countedLines += 1;
        bargainSavedCents.cents +=
          (movement.listUnitCostCents - movement.unitCostCents) * movement.quantity;
      }
    }

    // Margin is stated against the revenue of the lines that actually had a
    // cost. Dividing by total revenue instead would understate the margin by
    // exactly as much of the catalogue as has no cost entered yet.
    const grossProfitCents = revenueOnCostedLines - costOfGoodsSold.cents;
    const grossMarginPercent =
      revenueOnCostedLines > 0
        ? Math.round((grossProfitCents / revenueOnCostedLines) * 1000) / 10
        : null;

    return {
      revenueCents: orderTotals._sum?.totalCents ?? 0,
      taxCollectedCents: orderTotals._sum?.taxCents ?? 0,
      shippingCents: orderTotals._sum?.shippingCents ?? 0,
      discountsCents: orderTotals._sum?.discountCents ?? 0,
      costOfGoodsSold,
      grossProfitCents,
      grossMarginPercent,
      orderCount: orderTotals._count._all,
      unitsSold,
      purchasesCents,
      bargainSavedCents,
    };
  }

  /** The most and least profitable products over the period. */
  async productMargins(range: AccountingRange, limit = 10): Promise<ProductMargin[]> {
    const lines = await prisma.orderItem.findMany({
      where: { order: soldWhere(range) },
      select: {
        productId: true,
        name: true,
        quantity: true,
        priceCents: true,
        unitCostCents: true,
      },
    });

    const byProduct = new Map<string, ProductMargin>();
    const costedRevenue = new Map<string, number>();

    for (const line of lines) {
      const entry = byProduct.get(line.productId) ?? {
        productId: line.productId,
        name: line.name,
        unitsSold: 0,
        revenueCents: 0,
        costCents: 0,
        profitCents: null,
        marginPercent: null,
        partial: false,
      };

      entry.unitsSold += line.quantity;
      entry.revenueCents += line.priceCents * line.quantity;
      if (line.unitCostCents === null) {
        entry.partial = true;
      } else {
        entry.costCents += line.unitCostCents * line.quantity;
        // Tracked alongside the cost so margin is stated against the revenue
        // it was actually earned on, not against lines with no cost.
        costedRevenue.set(
          line.productId,
          (costedRevenue.get(line.productId) ?? 0) + line.priceCents * line.quantity,
        );
      }

      byProduct.set(line.productId, entry);
    }

    for (const entry of byProduct.values()) {
      const earned = costedRevenue.get(entry.productId) ?? 0;
      if (earned === 0) {
        entry.profitCents = null;
        entry.marginPercent = null;
        continue;
      }
      entry.profitCents = earned - entry.costCents;
      entry.marginPercent = Math.round((entry.profitCents / earned) * 1000) / 10;
    }

    // Products whose margin is unknown sort last: the table is read to find
    // what earns, and an unknown is not an answer to that.
    return [...byProduct.values()]
      .sort((a, b) => (b.profitCents ?? -Infinity) - (a.profitCents ?? -Infinity))
      .slice(0, limit);
  }

  /**
   * What the stock on the shelves cost to buy.
   *
   * Valued at the product's cost price rather than at what any particular
   * delivery cost, because a shelf holds units from several deliveries and
   * nothing records which unit came from which. Stated as an estimate for
   * that reason.
   */
  async stockValuation(): Promise<StockValuation> {
    const levels = await prisma.inventoryLevel.findMany({
      where: { quantity: { gt: 0 } },
      select: {
        quantity: true,
        variant: { select: { product: { select: { costCents: true } } } },
      },
    });

    let valuedAtCostCents = 0;
    let valuedUnits = 0;
    let unvaluedUnits = 0;

    for (const level of levels) {
      const cost = level.variant.product.costCents;
      if (cost === null) unvaluedUnits += level.quantity;
      else {
        valuedUnits += level.quantity;
        valuedAtCostCents += cost * level.quantity;
      }
    }

    return { valuedAtCostCents, valuedUnits, unvaluedUnits };
  }
}

export const accountingService = new AccountingService();
