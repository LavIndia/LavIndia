/**
 * Client tiers on the Customers screen, by what a client has actually paid
 * over their lifetime across both channels (see `customer-list.ts`).
 *
 * Pure, so the client-side table can use it.
 */
/** The tier a client's lifetime spend (in paise) puts them in. */
export function customerTier(totalSpentCents: number) {
  if (totalSpentCents >= 50_000_00) return { label: "VIP", variant: "default" as const };
  if (totalSpentCents >= 20_000_00) return { label: "Gold", variant: "secondary" as const };
  if (totalSpentCents >= 5_000_00) return { label: "Silver", variant: "outline" as const };
  return { label: "Regular", variant: "outline" as const };
}
