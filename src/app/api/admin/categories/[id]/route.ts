import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const categoryUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const validatedData = categoryUpdateSchema.parse(body);

    const category = await prisma.category.update({
      where: { id },
      data: validatedData,
    });

    await prisma.auditLog.create({
      data: {
        adminId: session.user.id!,
        adminName: session.user.name || undefined,
        action: "UPDATE",
        entity: "Category",
        entityId: category.id,
        metadata: { categoryName: category.name },
      },
    });

    revalidateTag("products");

    return NextResponse.json(category);
  } catch {
    return NextResponse.json(
      { error: "Failed to update category" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const category = await prisma.category.findUnique({
      where: { id },
      select: { id: true, name: true },
    });

    if (!category) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    await prisma.category.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        adminId: session.user.id!,
        adminName: session.user.name || undefined,
        action: "DELETE",
        entity: "Category",
        entityId: category.id,
        metadata: { categoryName: category.name },
      },
    });

    revalidateTag("products");

    return NextResponse.json({ message: "Category deleted successfully" });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete category" },
      { status: 500 }
    );
  }
}
