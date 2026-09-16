import type { Discount } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isWithinRecurrence } from "@/lib/scheduling";

export function computeDiscountCents(
  discount: Discount,
  subtotalCents: number,
): number {
  let amount =
    discount.discountType === "PERCENTAGE"
      ? Math.round((subtotalCents * discount.discountValue) / 100)
      : discount.discountValue;

  if (discount.discountType === "PERCENTAGE" && discount.maxDiscount) {
    amount = Math.min(amount, discount.maxDiscount);
  }

  return Math.max(0, Math.min(amount, subtotalCents));
}

export function checkDiscountEligibility(
  discount: Discount,
  subtotalCents: number,
): string | null {
  const now = new Date();

  if (!discount.isActive) return "This coupon is no longer active";
  if (now < discount.startDate) return "This coupon isn't active yet";
  if (now > discount.endDate) return "This coupon has expired";
  if (!isWithinRecurrence(discount, now)) {
    return "This coupon isn't active right now — check when it runs";
  }
  if (discount.minPurchase && subtotalCents < discount.minPurchase) {
    return `Minimum purchase of ₹${(discount.minPurchase / 100).toLocaleString("en-IN")} required`;
  }
  if (discount.usageLimit !== null && discount.usedCount >= discount.usageLimit) {
    return "This coupon has reached its usage limit";
  }

  return null;
}

export async function findDiscountByCode(code: string) {
  const trimmed = code.trim();
  if (!trimmed) return null;
  return prisma.discount.findFirst({
    where: { code: { equals: trimmed, mode: "insensitive" } },
  });
}
