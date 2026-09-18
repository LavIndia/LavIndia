import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      where: {
        isFeatured: true,
      },
      orderBy: { featuredOrder: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        image: true,
        featuredOrder: true,
      },
    });

    return NextResponse.json(
      { categories },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Error fetching featured categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}
