import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    const where = type ? { type } : {};

    const banners = await prisma.promoBanner.findMany({
      where,
      orderBy: { order: "asc" },
    });

    return NextResponse.json({ banners });
  } catch (error) {
    console.error("Error fetching promo banners:", error);
    return NextResponse.json(
      { error: "Failed to fetch promo banners" },
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
      type,
      title,
      message,
      bgColor,
      textColor,
      isActive,
      startDate,
      endDate,
      order,
      isRecurring,
      recurrenceType,
      recurrenceDaysOfWeek,
      recurrenceDayOfMonth,
      recurrenceStartTime,
      recurrenceEndTime,
    } = body;

    if (!type || !message) {
      return NextResponse.json(
        { error: "Type and message are required" },
        { status: 400 }
      );
    }

    const banner = await prisma.promoBanner.create({
      data: {
        type,
        title,
        message,
        bgColor,
        textColor,
        isActive: isActive ?? true,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        order: order ?? 0,
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
      entity: "PromoBanner",
      entityId: banner.id,
      metadata: { type: banner.type, message: banner.message },
    });

    revalidateTag("homepage");

    return NextResponse.json({ banner });
  } catch (error) {
    console.error("Error creating promo banner:", error);
    return NextResponse.json(
      { error: "Failed to create promo banner" },
      { status: 500 }
    );
  }
}
