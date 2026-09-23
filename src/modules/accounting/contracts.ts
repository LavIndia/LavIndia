/**
 * Accounting — what the shop made, what it spent, and what it is holding.
 *
 * A reading module. It owns no rows of its own: every figure here is derived
 * from orders, from the inventory ledger and from the catalogue's cost
 * prices. That is deliberate — a stored running total is a second source of
 * truth, and the first thing it does is disagree with the first.
 *
 * Every total that can be incomplete says so. A shop that has entered cost
 * prices for half its catalogue should see half a cost-of-goods figure
 * clearly labelled, not a confident number that is quietly wrong.
 */

/** A money figure that knows how much of its input was missing. */
export interface PartialTotal {
  /** In paisa, over the lines that had the figure recorded. */
  cents: number;
  /** Lines that contributed. */
  countedLines: number;
  /** Lines skipped because the figure was not recorded on them. */
  missingLines: number;
}

export interface AccountingSummary {
  /** Net of discounts, before tax. What the shop actually charged for goods. */
  revenueCents: number;
  /** GST charged on those sales. Collected on behalf of the government. */
  taxCollectedCents: number;
  /** Delivery charged to customers. */
  shippingCents: number;
  /** Discounts given away across the period. */
  discountsCents: number;
  /** What the goods sold had cost, from the cost frozen on each line. */
  costOfGoodsSold: PartialTotal;
  /** Revenue minus cost of goods sold, over the lines that had a cost. */
  grossProfitCents: number;
  /** Gross profit as a percentage of the revenue it was earned on. */
  grossMarginPercent: number | null;
  /** Orders counted. */
  orderCount: number;
  /** Units sold. */
  unitsSold: number;
  /** Paid out to suppliers for stock received in the period. */
  purchasesCents: PartialTotal;
  /**
   * What bargaining took off the asking price, in paisa.
   *
   * Counted only over lines where both the asking price and the price paid
   * were recorded, since a saving is a comparison and needs both ends of it.
   * Worth its own figure because spend is recorded everywhere and savings
   * nowhere, so a buyer's whole contribution is otherwise invisible.
   */
  bargainSavedCents: PartialTotal;
}

/** One product's contribution, for the ranked tables. */
export interface ProductMargin {
  productId: string;
  name: string;
  unitsSold: number;
  /** Everything this product took, across every line. */
  revenueCents: number;
  /** What the sold units cost, over the lines that recorded a cost. */
  costCents: number;
  /**
   * Profit over the costed lines only, and null when none of them had a
   * cost.
   *
   * Null rather than zero, because a product whose cost nobody entered has
   * not been sold at a hundred percent margin — its margin is simply not
   * known, and saying so is the only honest thing the column can do.
   */
  profitCents: number | null;
  marginPercent: number | null;
  /** True when some lines had no cost, so the profit shown is partial. */
  partial: boolean;
}

/** What the unsold stock on the shelves is worth at what it cost. */
export interface StockValuation {
  valuedAtCostCents: number;
  /** Units whose product has a cost recorded. */
  valuedUnits: number;
  /** Units with no cost recorded, which cannot be valued. */
  unvaluedUnits: number;
}
