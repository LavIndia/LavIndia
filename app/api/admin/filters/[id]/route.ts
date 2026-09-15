import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, props: RouteParams) {
  try {
    const params = await props.params;
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const filter = await prisma.filter.findUnique({
      where: { id: params.id },
      include: {
        options: {
          orderBy: { order: "asc" },
        },
        categories: {
          include: { category: true },
        },
      },
    });

    if (!filter) {
      return NextResponse.json({ error: "Filter not found" }, { status: 404 });
    }

    return NextResponse.json({ filter });
  } catch (error) {
    console.error("Error fetching filter:", error);
    return NextResponse.json(
      { error: "Failed to fetch filter" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, props: RouteParams) {
  try {
    const params = await props.params;
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, slug, type, description, isActive, options, categoryIds } = body;

    const existingFilter = await prisma.filter.findUnique({
      where: { id: params.id },
    });

    if (!existingFilter) {
      return NextResponse.json({ error: "Filter not found" }, { status: 404 });
    }

    const filter = await prisma.filter.update({
      where: { id: params.id },
      data: {
        name,
        slug,
        type,
        description,
        isActive,
      },
    });

    // Update options - delete old ones and create new ones
    await prisma.filterOption.deleteMany({
      where: { filterId: params.id },
    });

    if (options && options.length > 0) {
      await prisma.filterOption.createMany({
        data: (options || []).map((opt: { label: string; value: string; color?: string | null }, idx: number) => ({
          filterId: params.id,
          label: opt.label,
          value: opt.value,
          color: opt.color,
          order: idx,
        })),
      });
    }

    // Update categories
    await prisma.filterCategory.deleteMany({
      where: { filterId: params.id },
    });

    if (categoryIds && categoryIds.length > 0) {
      await prisma.filterCategory.createMany({
        data: (categoryIds || []).map((catId: string, idx: number) => ({
          filterId: params.id,
          categoryId: catId,
          order: idx,
        })),
      });
    }

    const updatedFilter = await prisma.filter.findUnique({
      where: { id: params.id },
      include: {
        options: true,
        categories: true,
      },
    });

    await logAudit({
      adminId: session.user.id || "system",
      adminName: session.user.name || session.user.email || "Admin",
      action: "UPDATE",
      entity: "Filter",
      entityId: params.id,
      metadata: { name: filter.name },
    });

    return NextResponse.json({ filter: updatedFilter });
  } catch (error) {
    console.error("Error updating filter:", error);
    return NextResponse.json(
      { error: "Failed to update filter" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, props: RouteParams) {
  try {
    const params = await props.params;
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const filter = await prisma.filter.update({
      where: { id: params.id },
      data: body,
    });

    return NextResponse.json({ filter });
  } catch (error) {
    console.error("Error updating filter:", error);
    return NextResponse.json(
      { error: "Failed to update filter" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, props: RouteParams) {
  try {
    const params = await props.params;
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const filter = await prisma.filter.findUnique({
      where: { id: params.id },
    });

    if (!filter) {
      return NextResponse.json({ error: "Filter not found" }, { status: 404 });
    }

    await prisma.filter.delete({
      where: { id: params.id },
    });

    await logAudit({
      adminId: session.user.id || "system",
      adminName: session.user.name || session.user.email || "Admin",
      action: "DELETE",
      entity: "Filter",
      entityId: params.id,
      metadata: { name: filter.name },
    });

    return NextResponse.json({ message: "Filter deleted successfully" });
  } catch (error) {
    console.error("Error deleting filter:", error);
    return NextResponse.json(
      { error: "Failed to delete filter" },
      { status: 500 }
    );
  }
}
