import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const discounts = await prisma.discount.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ discounts });
  } catch (error) {
    console.error("Error fetching discounts:", error);
    return NextResponse.json(
      { error: "Failed to fetch discounts" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      code,
      title,
      description,
      discountType,
      discountValue,
      minPurchase,
      maxDiscount,
      startDate,
      endDate,
      isActive,
      usageLimit,
      isRecurring,
      recurrenceType,
      recurrenceDaysOfWeek,
      recurrenceDayOfMonth,
      recurrenceStartTime,
      recurrenceEndTime,
    } = body;

    if (
      !code ||
      !title ||
      !discountType ||
      !discountValue ||
      !startDate ||
      !endDate
    ) {
      return NextResponse.json(
        { error: "Required fields missing" },
        { status: 400 }
      );
    }

    const discount = await prisma.discount.create({
      data: {
        code: code.toUpperCase(),
        title,
        description,
        discountType,
        discountValue,
        minPurchase,
        maxDiscount,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        isActive: isActive ?? true,
        usageLimit,
        isRecurring: isRecurring ?? false,
        recurrenceType: isRecurring ? recurrenceType : null,
        recurrenceDaysOfWeek: isRecurring ? recurrenceDaysOfWeek ?? [] : [],
        recurrenceDayOfMonth: isRecurring ? recurrenceDayOfMonth : null,
        recurrenceStartTime: isRecurring ? recurrenceStartTime : null,
        recurrenceEndTime: isRecurring ? recurrenceEndTime : null,
      },
    });

    await logAudit({
      adminId: session.user.id || "system",
      adminName: session.user.name || session.user.email || "Admin",
      action: "CREATE",
      entity: "Discount",
      entityId: discount.id,
      metadata: { code: discount.code },
    });

    revalidateTag("homepage");

    return NextResponse.json({ discount });
  } catch (error: unknown) {
    console.error("Error creating discount:", error);
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Discount code already exists" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create discount" },
      { status: 500 }
    );
  }
}
