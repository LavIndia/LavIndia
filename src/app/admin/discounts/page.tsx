import { redirect } from "next/navigation";

/**
 * Coupons are now offers with a code, built and run from Admin → Offers.
 * The old coupon list is kept as read-only history in the database; its
 * codes were carried over by scripts/migrate-discounts-to-promotions.ts.
 */
export default function DiscountsPage() {
  redirect("/admin/promotions");
}
