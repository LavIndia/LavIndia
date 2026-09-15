import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const settings = await prisma.siteSettings.findFirst({
      select: {
        codAvailable: true,
        customerCount: true,
        rating: true,
        supportHoursStart: true,
        supportHoursEnd: true,
      },
    });

    if (!settings) {
      return NextResponse.json({
        codAvailable: false,
        customerCount: 0,
        rating: 0,
        supportHoursStart: null,
        supportHoursEnd: null,
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error fetching site settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}
