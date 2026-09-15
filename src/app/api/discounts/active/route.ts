import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const now = new Date();

    const discounts = await prisma.discount.findMany({
      where: {
        isActive: true,
        startDate: {
          lte: now,
        },
        endDate: {
          gte: now,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ discounts });
  } catch (error) {
    console.error("Active discounts fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch active discounts" },
      { status: 500 }
    );
  }
}
