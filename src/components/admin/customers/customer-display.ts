import type { CustomerListRow } from "@/modules/customers/customer-list";
import type { CustomerFilters } from "@/modules/customers/customer-filters";
import {
  CUSTOMER_TIERS,
  tierSpendRange,
  type CustomerTierKey,
  type TierThresholds,
} from "@/modules/customers/customer-tier";

export type CustomerRow = CustomerListRow;

export const formatRupees = (cents: number) =>
  `₹${Math.round(cents / 100).toLocaleString("en-IN")}`;

export const formatJoined = (date: Date) =>
  new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });

/**
 * The line a client is listed under, and the contact details beneath it.
 *
 * A client who never gave a name is listed under their mobile number or
 * email instead — never a placeholder like "N/A" — and whatever is used as
 * the heading is not repeated below it. Empty details are simply left out.
 */
export function customerHeading(customer: CustomerRow) {
  const name = customer.name?.trim();
  const email = customer.email?.trim() || null;
  const mobile = customer.mobile?.trim() || null;
  if (name) return { title: name, details: [email, mobile].filter(Boolean) as string[] };
  if (mobile) return { title: mobile, details: email ? [email] : [] };
  return { title: email ?? "", details: [] };
}

/** The spend a tier covers, in words: "₹20,000 to ₹49,999". */
export function tierRangeLabel(key: CustomerTierKey, thresholds: TierThresholds) {
  const { min, max } = tierSpendRange(key, thresholds);
  if (max === null) return `${formatRupees(min)} and above`;
  if (min === 0) return `Below ${formatRupees(max)}`;
  return `${formatRupees(min)} to ${formatRupees(max - 100)}`;
}

/** What an empty list says, so a search that found nobody reads as such. */
export function emptyCustomersMessage(filters: CustomerFilters) {
  const tier = CUSTOMER_TIERS.find((t) => t.key === filters.tier);
  const who = tier ? `${tier.label} clients` : "clients";
  if (filters.q) return `No ${who} match “${filters.q}”.`;
  if (tier) return `No ${who} at present.`;
  return "No clients yet.";
}
