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

    const filters = await prisma.filter.findMany({
      include: {
        options: {
          orderBy: { order: "asc" },
        },
        categories: {
          include: { category: true },
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

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, slug, type, description, isActive, options, categoryIds } = body;

    if (!name || !slug) {
      return NextResponse.json(
        { error: "Name and slug are required" },
        { status: 400 }
      );
    }

    const filter = await prisma.filter.create({
      data: {
        name,
        slug,
        type: type || "CHECKBOX",
        description,
        isActive: isActive ?? true,
        options: {
          createMany: {
            data: (options || []).map((opt: { label: string; value: string; color?: string | null }, idx: number) => ({
              label: opt.label,
              value: opt.value,
              color: opt.color,
              order: idx,
            })),
          },
        },
        categories: {
          createMany: {
            data: (categoryIds || []).map((catId: string, idx: number) => ({
              categoryId: catId,
              order: idx,
            })),
          },
        },
      },
      include: {
        options: true,
        categories: true,
      },
    });

    await logAudit({
      adminId: session.user.id || "system",
      adminName: session.user.name || session.user.email || "Admin",
      action: "CREATE",
      entity: "Filter",
      entityId: filter.id,
      metadata: { name: filter.name },
    });

    return NextResponse.json({ filter }, { status: 201 });
  } catch (error) {
    console.error("Error creating filter:", error);
    return NextResponse.json(
      { error: "Failed to create filter" },
      { status: 500 }
    );
  }
}
