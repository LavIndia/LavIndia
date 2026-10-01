import { unparse } from "papaparse";
import { listCustomers } from "@/modules/customers/customer-list";
import { parseCustomerFilters } from "@/modules/customers/customer-filters";
import { customerTier } from "@/modules/customers/customer-tier";
import { loadTierThresholds } from "@/modules/customers/tier-settings";

/**
 * The Customers CSV: the same figures as the Customers screen — both
 * channels, spend as what was actually paid on orders that are sales — for
 * the list as narrowed there (`?q=` and `?tier=`), with each client's tier by
 * the shop's own thresholds.
 */
export async function exportCustomersCsv(searchParams: URLSearchParams) {
  const thresholds = await loadTierThresholds();
  const filters = parseCustomerFilters({ q: searchParams.get("q"), tier: searchParams.get("tier") });
  const customers = await listCustomers(filters, thresholds);

  const data = customers.map((c) => ({
    Name: c.name || "",
    Email: c.email || "",
    Mobile: c.mobile || "",
    OrderCount: c.orderCount,
    TotalSpent: (c.totalSpent / 100).toFixed(2),
    Tier: customerTier(c.totalSpent, thresholds).label,
    JoinedAt: c.createdAt.toISOString(),
  }));

  return unparse(data);
}
