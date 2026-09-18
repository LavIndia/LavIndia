import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { removePublicAsset } from "@/lib/imagekit-admin";
import { z } from "zod";

const categoryUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  image: z.string().optional().nullable(),
  isFeatured: z.boolean().optional(),
  featuredOrder: z.number().int().optional(),
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

    const previous = await prisma.category.findUnique({
      where: { id },
      select: { image: true },
    });

    const category = await prisma.category.update({
      where: { id },
      data: validatedData,
    });

    if (
      previous?.image &&
      previous.image.startsWith("/assets/") &&
      validatedData.image !== undefined &&
      validatedData.image !== previous.image
    ) {
      try {
        await removePublicAsset(previous.image);
      } catch (error) {
        console.error("Failed to remove old category image:", error);
      }
    }

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
    revalidateTag("homepage");

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
      select: {
        id: true,
        name: true,
        image: true,
        _count: { select: { products: true } },
      },
    });

    if (!category) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    if (category._count.products > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete "${category.name}" because it still has ${category._count.products} product${
            category._count.products === 1 ? "" : "s"
          }. Move or delete those products first.`,
        },
        { status: 409 }
      );
    }

    await prisma.category.delete({ where: { id } });

    if (category.image && category.image.startsWith("/assets/")) {
      try {
        await removePublicAsset(category.image);
      } catch (error) {
        console.error("Failed to remove category image:", error);
      }
    }

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
    revalidateTag("homepage");

    return NextResponse.json({ message: "Category deleted successfully" });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete category" },
      { status: 500 }
    );
  }
}
