import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categorySlug = searchParams.get("category");

    if (!categorySlug) {
      return NextResponse.json(
        { error: "category parameter is required" },
        { status: 400 }
      );
    }

    const filters = await prisma.filter.findMany({
      where: {
        isActive: true,
        categories: {
          some: {
            category: { slug: categorySlug },
          },
        },
      },
      include: {
        options: {
          orderBy: { order: "asc" },
        },
      },
      orderBy: { order: "asc" },
    });

    return NextResponse.json({ filters });
  } catch (error) {
    console.error("Error fetching filters:", error);
    return NextResponse.json(
      { error: "Failed to fetch filters" },
      { status: 500 }
    );
  }
}
