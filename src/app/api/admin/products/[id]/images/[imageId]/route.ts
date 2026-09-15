import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { removePublicAsset } from "@/lib/imagekit-admin";
import { z } from "zod";

const imageUpdateSchema = z.object({
  alt: z.string().optional().nullable(),
  isPrimary: z.boolean().optional(),
  position: z.number().int().min(0).optional(),
});

// PATCH /api/admin/products/[id]/images/[imageId] - Update image
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; imageId: string }> },
) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { imageId } = await params;
    const body = await req.json();
    const validatedData = imageUpdateSchema.parse(body);

    const image = await prisma.productImage.update({
      where: { id: imageId },
      data: validatedData,
    });

    return NextResponse.json(image);
  } catch {
    return NextResponse.json(
      { error: "Failed to update image" },
      { status: 500 },
    );
  }
}

// DELETE /api/admin/products/[id]/images/[imageId] - Delete image
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; imageId: string }> },
) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, imageId } = await params;

    const image = await prisma.productImage.findFirst({
      where: { id: imageId, productId: id },
    });

    if (!image) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    await prisma.productImage.delete({ where: { id: imageId } });

    if (image.url.startsWith("/assets/")) {
      await removePublicAsset(image.url);
    }

    return NextResponse.json({ message: "Image deleted" });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete image" },
      { status: 500 },
    );
  }
}
