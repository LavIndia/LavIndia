import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tiers = await prisma.budgetTier.findMany({
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

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { title, maxPrice, gradient, icon, order, isActive } = body;

    if (!title || !maxPrice || !gradient) {
      return NextResponse.json(
        { error: "Title, maxPrice, and gradient are required" },
        { status: 400 }
      );
    }

    const tier = await prisma.budgetTier.create({
      data: {
        title,
        maxPrice,
        gradient,
        icon,
        order: order ?? 0,
        isActive: isActive ?? true,
      },
    });

    await logAudit({
      adminId: session.user.id || "system",
      adminName: session.user.name || session.user.email || "Admin",
      action: "CREATE",
      entity: "BudgetTier",
      entityId: tier.id,
      metadata: { title: tier.title, maxPrice: tier.maxPrice },
    });

    return NextResponse.json({ tier });
  } catch (error) {
    console.error("Error creating budget tier:", error);
    return NextResponse.json(
      { error: "Failed to create budget tier" },
      { status: 500 }
    );
  }
}
