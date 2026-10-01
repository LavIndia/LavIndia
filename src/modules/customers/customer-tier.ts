/**
 * Client tiers on the Customers screen, by what a client has actually paid
 * over their lifetime across both channels (see `customer-list.ts`).
 *
 * The rupee thresholds are the shop's to set (Settings → Client tiers), so
 * every function here takes them as a parameter. Pure, so the client-side
 * table and the settings form can use it too.
 */

export type CustomerTierKey = "vip" | "gold" | "silver" | "regular";

/** The lifetime spend, in paise, at which each tier begins. */
export interface TierThresholds {
  vipCents: number;
  goldCents: number;
  silverCents: number;
}

/** What the database defaults to: ₹50,000, ₹20,000 and ₹5,000. */
export const DEFAULT_TIER_THRESHOLDS: TierThresholds = {
  vipCents: 50_000_00,
  goldCents: 20_000_00,
  silverCents: 5_000_00,
};

/**
 * The highest threshold the settings accept, in paise (₹2 crore) — the
 * column is a 32-bit integer of paise.
 */
export const MAX_TIER_THRESHOLD_CENTS = 2_000_000_000;

const TIERS = [
  { key: "vip", label: "VIP", variant: "default" },
  { key: "gold", label: "Gold", variant: "secondary" },
  { key: "silver", label: "Silver", variant: "outline" },
  { key: "regular", label: "Regular", variant: "outline" },
] as const;

export type CustomerTier = (typeof TIERS)[number];

/** Highest first, as the filter chips list them. */
export const CUSTOMER_TIERS: readonly CustomerTier[] = TIERS;

export function isCustomerTierKey(value: unknown): value is CustomerTierKey {
  return TIERS.some((tier) => tier.key === value);
}

/** The tier a client's lifetime spend (in paise) puts them in. */
export function customerTier(totalSpentCents: number, thresholds: TierThresholds): CustomerTier {
  if (totalSpentCents >= thresholds.vipCents) return TIERS[0];
  if (totalSpentCents >= thresholds.goldCents) return TIERS[1];
  if (totalSpentCents >= thresholds.silverCents) return TIERS[2];
  return TIERS[3];
}

/**
 * The spend, in paise, a tier covers: from `min` inclusive up to `max`
 * exclusive (`null` for VIP, which has no ceiling).
 */
export function tierSpendRange(key: CustomerTierKey, thresholds: TierThresholds) {
  switch (key) {
    case "vip":
      return { min: thresholds.vipCents, max: null };
    case "gold":
      return { min: thresholds.goldCents, max: thresholds.vipCents };
    case "silver":
      return { min: thresholds.silverCents, max: thresholds.goldCents };
    default:
      return { min: 0, max: thresholds.silverCents };
  }
}

/** The settings columns, read as thresholds. */
export function tierThresholdsFrom(settings: {
  tierVipCents: number;
  tierGoldCents: number;
  tierSilverCents: number;
}): TierThresholds {
  return {
    vipCents: settings.tierVipCents,
    goldCents: settings.tierGoldCents,
    silverCents: settings.tierSilverCents,
  };
}

/**
 * What is wrong with a set of thresholds, in words for the person setting
 * them, or null when they are sound. Each tier must begin above the one
 * beneath it, or a tier would be empty and the list would mislead.
 */
export function tierThresholdProblem(t: TierThresholds): string | null {
  const values = [t.vipCents, t.goldCents, t.silverCents];
  if (values.some((v) => !Number.isInteger(v))) return "Enter each tier as a whole rupee amount.";
  if (t.silverCents <= 0) return "Silver must begin above ₹0.";
  if (values.some((v) => v > MAX_TIER_THRESHOLD_CENTS)) return "A tier can begin at no more than ₹2,00,00,000.";
  if (t.goldCents <= t.silverCents) return "Gold must begin above Silver.";
  if (t.vipCents <= t.goldCents) return "VIP must begin above Gold.";
  return null;
}
