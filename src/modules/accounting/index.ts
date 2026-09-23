/**
 * Accounting module — public surface.
 *
 * Reads orders, the inventory ledger and cost prices; owns none of them.
 * Every figure is derived at read time so there is no stored total to drift
 * out of step with the records it summarises.
 */
export { accountingService } from "./accounting-service";
export type { AccountingRange } from "./accounting-service";
export type {
  AccountingSummary,
  PartialTotal,
  ProductMargin,
  StockValuation,
} from "./contracts";
