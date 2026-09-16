import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  checkDiscountEligibility,
  computeDiscountCents,
  findDiscountByCode,
} from "@/lib/discounts";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ valid: false, error: "Please sign in first" }, { status: 401 });
    }

    const body = await req.json();
    const code = typeof body?.code === "string" ? body.code : "";
    const subtotalCents = Number(body?.subtotalCents);

    if (!code.trim() || !Number.isFinite(subtotalCents) || subtotalCents <= 0) {
      return NextResponse.json({ valid: false, error: "Invalid request" }, { status: 400 });
    }

    const discount = await findDiscountByCode(code);
    if (!discount) {
      return NextResponse.json({ valid: false, error: "Invalid coupon code" });
    }

    const eligibilityError = checkDiscountEligibility(discount, subtotalCents);
    if (eligibilityError) {
      return NextResponse.json({ valid: false, error: eligibilityError });
    }

    const discountCents = computeDiscountCents(discount, subtotalCents);

    return NextResponse.json({
      valid: true,
      code: discount.code,
      title: discount.title,
      discountCents,
    });
  } catch (error) {
    console.error("Discount validation error:", error);
    return NextResponse.json(
      { valid: false, error: "Something went wrong" },
      { status: 500 },
    );
  }
}
