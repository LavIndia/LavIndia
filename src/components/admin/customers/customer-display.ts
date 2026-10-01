import type { CustomerListRow } from "@/modules/customers/customer-list";

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
