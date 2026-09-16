import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isScheduledActive } from "@/lib/scheduling";

export async function GET() {
  try {
    const candidates = await prisma.heroBanner.findMany({
      where: {
        active: true,
        AND: [
          { OR: [{ startDate: null }, { startDate: { lte: new Date() } }] },
          { OR: [{ endDate: null }, { endDate: { gte: new Date() } }] },
        ],
      },
      orderBy: { order: "asc" },
    });

    // The DB query above narrows to the outer date window; recurrence
    // (specific weekdays/time-of-day) is evaluated in JS since it isn't
    // expressible as a simple SQL WHERE clause.
    const banners = candidates.filter((banner) =>
      isScheduledActive({ ...banner, isActive: banner.active }),
    );

    return NextResponse.json({ banners });
  } catch (error) {
    console.error("Error fetching active hero banners:", error);
    return NextResponse.json(
      { error: "Failed to fetch hero banners" },
      { status: 500 }
    );
  }
}
