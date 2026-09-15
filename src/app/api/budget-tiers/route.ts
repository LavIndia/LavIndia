import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const tiers = await prisma.budgetTier.findMany({
      where: {
        isActive: true,
      },
      orderBy: { order: "asc" },
    });

    return NextResponse.json({ tiers });
  } catch (error) {
    console.error("Error fetching budget tiers:", error);
    return NextResponse.json(
      { error: "Failed to fetch budget tiers" },
      { status: 500 }
    );
  }
}
