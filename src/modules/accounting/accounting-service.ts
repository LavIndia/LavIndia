/**
 * The books, derived rather than stored.
 *
 * Only sales are counted — the same orders the Dashboard and Sales Insights
 * count (see `paid-amount.ts`): never cancelled, refunded or still-unpaid
 * orders. Money is taken from list price down to what clients paid in one
 * statement, so every figure on the accounting screen reconciles with the
 * others and with the Dashboard. The SQL lives in `accounting-sql.ts`.
 */
import { prisma } from "../_shared/db";
import type {
  AccountingSummary,
  PartialTotal,
  ProductMargin,
  StockValuation,
} from "./contracts";
import {
  lineCostSql,
  orderMoneySql,
  productLinesSql,
  type AccountingRange,
} from "./accounting-sql";

export type { AccountingRange };

/** The window as a Prisma filter, or nothing at all for "all time". */
function createdWithin(range: AccountingRange) {
  if (!range.from && !range.to) return {};
  return {
    createdAt: {
      ...(range.from ? { gte: range.from } : {}),
      ...(range.to ? { lte: range.to } : {}),
    },
  };
}

function emptyTotal(): PartialTotal {
  return { cents: 0, countedLines: 0, missingLines: 0 };
}

/** Margin as a percentage to one decimal, or null when there is nothing to divide by. */
function marginPercent(profitCents: number, earnedCents: number): number | null {
  return earnedCents > 0 ? Math.round((profitCents / earnedCents) * 1000) / 10 : null;
}

interface OrderMoneyRow {
  orders: bigint;
  gross: bigint;
  discounts: bigint;
  manual: bigint;
  gst: bigint;
  gstInside: bigint;
  delivery: bigint;
  cod: bigint;
  paid: bigint;
}

interface LineCostRow {
  units: bigint;
  costedLines: bigint;
  uncostedLines: bigint;
  cogs: bigint;
  costedNet: bigint;
}

interface ProductLineRow {
  productId: string | null;
  name: string;
  units: bigint;
  net: bigint;
  costedNet: bigint;
  cost: bigint;
  costedLines: bigint;
  partial: boolean;
}

class AccountingService {
  /**
   * The headline figures for a period.
   *
   * Three queries, each a single aggregate in the database: the order money,
   * the sold lines' cost, and the purchases.
   */
  async summary(range: AccountingRange): Promise<AccountingSummary> {
    const [moneyRows, costRows, purchases] = await Promise.all([
      prisma.$queryRaw<OrderMoneyRow[]>(orderMoneySql(range)),
      prisma.$queryRaw<LineCostRow[]>(lineCostSql(range)),
      prisma.inventoryMovement.findMany({
        where: { type: "RECEIVE", ...createdWithin(range) },
        select: { quantity: true, unitCostCents: true, listUnitCostCents: true },
      }),
    ]);

    const money = moneyRows[0];
    const cost = costRows[0];
    const n = (value: bigint | undefined) => Number(value ?? 0);

    const grossSalesCents = n(money?.gross);
    const discountsCents = n(money?.discounts);
    const manualDiscountsCents = n(money?.manual);
    const gstInsidePricesCents = n(money?.gstInside);

    const costOfGoodsSold: PartialTotal = {
      cents: n(cost?.cogs),
      countedLines: n(cost?.costedLines),
      missingLines: n(cost?.uncostedLines),
    };

    // Margin is stated against the net sales of the lines that actually had
    // a cost. Dividing by all net sales instead would understate the margin
    // by exactly as much of the catalogue as has no cost entered yet.
    const costedNet = n(cost?.costedNet);
    const grossProfitCents = costedNet - costOfGoodsSold.cents;

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

    return {
      grossSalesCents,
      offerDiscountsCents: discountsCents - manualDiscountsCents,
      manualDiscountsCents,
      discountsCents,
      gstInsidePricesCents,
      netSalesCents: grossSalesCents - discountsCents - gstInsidePricesCents,
      taxCollectedCents: n(money?.gst),
      shippingCents: n(money?.delivery),
      codFeeCents: n(money?.cod),
      collectedCents: n(money?.paid),
      costOfGoodsSold,
      grossProfitCents,
      grossMarginPercent: marginPercent(grossProfitCents, costedNet),
      orderCount: n(money?.orders),
      unitsSold: n(cost?.units),
      purchasesCents,
      bargainSavedCents,
    };
  }

  /** The most and least profitable products over the period, one grouped query. */
  async productMargins(range: AccountingRange, limit = 10): Promise<ProductMargin[]> {
    const rows = await prisma.$queryRaw<ProductLineRow[]>(productLinesSql(range));

    const margins = rows.map((row): ProductMargin => {
      const earned = Number(row.costedNet);
      const costCents = Number(row.cost);
      // Profit is over the lines that had a cost; with none, it is unknown —
      // not a hundred percent margin.
      const profitCents = Number(row.costedLines) > 0 ? earned - costCents : null;
      return {
        productId: row.productId,
        name: row.name,
        unitsSold: Number(row.units),
        netSalesCents: Number(row.net),
        costCents,
        profitCents,
        marginPercent: profitCents === null ? null : marginPercent(profitCents, earned),
        partial: row.partial,
      };
    });

    // Products whose margin is unknown sort last: the table is read to find
    // what earns, and an unknown is not an answer to that.
    return margins
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
