import { redirect } from "next/navigation";

/** Coupons are created and edited as offers now — see Admin → Offers. */
export default function DiscountRedirect() {
  redirect("/admin/promotions");
}
