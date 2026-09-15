import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    const now = new Date();

    const where: Prisma.PromoBannerWhereInput = {
      isActive: true,
      OR: [
        { startDate: null, endDate: null },
        { startDate: { lte: now }, endDate: null },
        { startDate: null, endDate: { gte: now } },
        { startDate: { lte: now }, endDate: { gte: now } },
      ],
    };

    if (type) {
      where.type = type;
    }

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
