import { isCustomerTierKey, type CustomerTierKey } from "./customer-tier";

/**
 * How the Customers list is narrowed: a search over name, email and mobile,
 * and a tier. Both live in the URL (`?q=&tier=`) alongside `?page=`, so a
 * narrowed list can be paged, refreshed, shared and exported as it stands.
 *
 * Pure, so the filter bar, the page and the CSV export read it alike.
 */
export interface CustomerFilters {
  q: string;
  tier: CustomerTierKey | "all";
}

export const EMPTY_CUSTOMER_FILTERS: CustomerFilters = { q: "", tier: "all" };

/** Longer than any name, email or mobile anyone would type. */
const MAX_SEARCH_LENGTH = 120;

export function parseCustomerFilters(params: { q?: string | null; tier?: string | null }): CustomerFilters {
  const q = (params.q ?? "").trim().slice(0, MAX_SEARCH_LENGTH);
  const tier = isCustomerTierKey(params.tier) ? params.tier : "all";
  return { q, tier };
}

export function hasCustomerFilters(filters: CustomerFilters) {
  return filters.q !== "" || filters.tier !== "all";
}

/** The query string for a filtered list, without the `?`; page 1 is left out. */
export function customersQuery(filters: CustomerFilters, page = 1) {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.tier !== "all") params.set("tier", filters.tier);
  if (page > 1) params.set("page", String(page));
  return params.toString();
}

/**
 * The digits to look for when the search is a mobile number, or null when it
 * is not one.
 *
 * Numbers are stored however they were typed — "+91 98765 43210",
 * "09876543210", "9876543210" — so both sides are reduced to digits, and a
 * country code or trunk zero in front of a full number is dropped, leaving the
 * ten digits that identify the line. A part of a number (four digits or more)
 * matches anywhere in it.
 */
export function mobileSearchDigits(q: string): string | null {
  if (!/^[\d\s+()\-.]+$/.test(q)) return null;
  const typed = q.replace(/[\s()\-.]/g, "");
  let digits = typed.replace(/\D/g, "");
  if (typed.startsWith("+91") || (digits.length === 12 && digits.startsWith("91"))) {
    digits = digits.slice(2);
  } else if (typed.startsWith("0")) {
    digits = digits.replace(/^0+/, "");
  }
  return digits.length >= 4 ? digits : null;
}
