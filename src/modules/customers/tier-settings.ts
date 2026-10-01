import { getSiteSettings } from "@/lib/site-settings";
import {
  DEFAULT_TIER_THRESHOLDS,
  tierThresholdProblem,
  tierThresholdsFrom,
  type TierThresholds,
} from "./customer-tier";

/**
 * The shop's client-tier thresholds, from Settings.
 *
 * Read through the cached site settings, so a Customers page or an export
 * costs no extra query; saving Settings revalidates that cache at once. Falls
 * back to the defaults when there are no settings yet, or when what is stored
 * would not make sense as tiers.
 */
export async function loadTierThresholds(): Promise<TierThresholds> {
  const settings = await getSiteSettings();
  // Absent from the fallback, and from a cached copy taken before the tiers
  // were added.
  if (!("tierVipCents" in settings) || typeof settings.tierVipCents !== "number") {
    return DEFAULT_TIER_THRESHOLDS;
  }
  const thresholds = tierThresholdsFrom(settings);
  return tierThresholdProblem(thresholds) ? DEFAULT_TIER_THRESHOLDS : thresholds;
}
