/**
 * The GST engine's contracts.
 *
 * The engine is pure: it is handed lines that already carry the rate version
 * they were classified under, and it never reads a database or the clock.
 * Resolving a product to an approved rate version is a separate step
 * (rates/resolver.ts), so what the engine does can be tested with plain data
 * and an order's tax can always be reproduced from what was recorded.
 */

export type SupplyType = "INTRA_STATE" | "INTER_STATE";

/** One approved rate version, as it stood when it was relied on. */
export interface RateVersion {
  /** The `gst_rate_master` row. Recorded on every calculation. */
  id: string;
  code: string;
  codeKind: "HSN" | "SAC";
  /** Total GST in basis points. 300 = 3%. */
  rateBps: number;
  cgstBps: number;
  sgstBps: number;
  igstBps: number;
  cessBps: number;
}

/** One line of goods, after every discount has been applied to it. */
export interface GoodsLine {
  lineId: string;
  /** What the buyer is charged for the line: tax-inclusive or not per `pricesIncludeTax`. */
  amountCents: number;
  rate: RateVersion;
  quantity?: number;
}

/**
 * How a charge that is not goods — delivery, cash-on-delivery — is taxed.
 *
 *   NONE            — carries no GST (what the shop does today).
 *   FOLLOWS_GOODS   — part of the supply of the goods, taxed with them.
 *   SEPARATE        — a supply of its own at its own rate (`rate` is required).
 */
export type ChargeTreatment = "NONE" | "FOLLOWS_GOODS" | "SEPARATE";

/** What to do when an order's goods carry more than one rate. */
export type MixedBasketPolicy = "PROPORTIONAL" | "HIGHEST_RATE";

export interface ChargeInput {
  kind: "SHIPPING" | "COD_FEE";
  amountCents: number;
  treatment: ChargeTreatment;
  rate?: RateVersion;
}

export interface GstInput {
  supplyType: SupplyType;
  /** Whether every amount already includes its GST. One setting for the whole document. */
  pricesIncludeTax: boolean;
  goods: readonly GoodsLine[];
  charges?: readonly ChargeInput[];
  mixedBasketPolicy?: MixedBasketPolicy;
}

/** The tax worked out on one amount at one rate. */
export interface TaxPart {
  rate: RateVersion;
  /** The value the tax is charged on. */
  taxableCents: number;
  cgstCents: number;
  sgstCents: number;
  igstCents: number;
  cessCents: number;
  /** cgst + sgst + igst + cess. */
  taxCents: number;
  /** What the buyer pays for this part: taxable + tax. */
  payableCents: number;
}

export interface LineResult extends TaxPart {
  lineId: string;
  kind: "GOODS" | "SHIPPING" | "COD_FEE";
  /** The amount handed to the engine for this part. */
  inputCents: number;
}

export interface Totals {
  taxableCents: number;
  cgstCents: number;
  sgstCents: number;
  igstCents: number;
  cessCents: number;
  taxCents: number;
  /** Sum of what the buyer pays across every part. */
  payableCents: number;
  /** Charges that carry no GST: they are payable but not taxable. */
  untaxedChargesCents: number;
}

export interface RateSummaryRow {
  rateVersionId: string;
  code: string;
  rateBps: number;
  taxableCents: number;
  cgstCents: number;
  sgstCents: number;
  igstCents: number;
  cessCents: number;
}

export interface GstResult {
  supplyType: SupplyType;
  pricesIncludeTax: boolean;
  lines: LineResult[];
  totals: Totals;
  rateSummary: RateSummaryRow[];
  /** Charges left untaxed because their treatment is NONE. */
  untaxedCharges: Array<{ kind: "SHIPPING" | "COD_FEE"; amountCents: number }>;
}
