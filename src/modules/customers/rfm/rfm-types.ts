/**
 * Contracts for RFM analysis.
 *
 * Kept apart from both the scoring rules and the database so a different
 * application — or a different store for the same application — can supply
 * the raw figures and get the same segmentation back.
 */

/** What a single customer did, before any scoring is applied. */
export interface RfmFacts {
  /**
   * Stable identity for this customer across channels.
   *
   * A person who buys online and at the counter is one customer, so this is
   * their mobile number where there is one, falling back to the account id.
   */
  customerKey: string;
  name: string | null;
  mobile: string | null;
  /** Null when the customer has never bought from us. */
  lastOrderAt: Date | null;
  orderCount: number;
  totalSpendCents: number;
  /** Whether they have ever bought at the counter, online, or both. */
  channels: ("STORE" | "ONLINE")[];
}

/** A quintile score. 5 is always the best end of the scale. */
export type RfmScore = 1 | 2 | 3 | 4 | 5;

/**
 * The eleven standard RFM segments.
 *
 * Named as the marketing literature names them so the terms mean the same
 * thing here as in anything the owner reads elsewhere. Each one implies a
 * different action, which is the entire point of segmenting at all — a list
 * that does not change what you do with a customer is just a sorted table.
 */
export type RfmSegment =
  | "CHAMPIONS"
  | "LOYAL"
  | "POTENTIAL_LOYALIST"
  | "NEW"
  | "PROMISING"
  | "NEEDS_ATTENTION"
  | "ABOUT_TO_SLEEP"
  | "AT_RISK"
  | "CANNOT_LOSE"
  | "HIBERNATING"
  | "LOST";

export interface RfmCustomer extends RfmFacts {
  /** Whole days since the last order. Null when they have never ordered. */
  recencyDays: number | null;
  recency: RfmScore;
  frequency: RfmScore;
  monetary: RfmScore;
  segment: RfmSegment;
}

export interface RfmSegmentSummary {
  segment: RfmSegment;
  customers: number;
  revenueCents: number;
  /** Share of total revenue, 0–1. Where the money actually is. */
  revenueShare: number;
  averageOrderValueCents: number;
}

export interface RfmBoard {
  customers: RfmCustomer[];
  segments: RfmSegmentSummary[];
  /** Counts per (recency, frequency) cell, for the 5×5 grid. */
  grid: { recency: RfmScore; frequency: RfmScore; customers: number }[];
  totalCustomers: number;
  totalRevenueCents: number;
  /** The day the analysis treats as "today", so scores are reproducible. */
  asOf: Date;
}
