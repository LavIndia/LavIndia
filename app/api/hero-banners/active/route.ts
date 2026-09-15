import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const banners = await prisma.heroBanner.findMany({
      where: {
        active: true,
      },
      orderBy: { order: "asc" },
    });

    return NextResponse.json({ banners });
  } catch (error) {
    console.error("Error fetching active hero banners:", error);
    return NextResponse.json(
      { error: "Failed to fetch hero banners" },
      { status: 500 }
    );
  }
}
