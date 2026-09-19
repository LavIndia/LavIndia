import { randomUUID } from "crypto";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { uploadPublicAsset } from "@/lib/imagekit-admin";
import { productImageFolder, publicAssetPath } from "@/lib/imagekit-paths";
import { prisma } from "@/lib/prisma";
const allowedTypes = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
]);
const maxFileSize = 10 * 1024 * 1024;

function toSafeFilename(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase()
    .slice(0, 60);
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const productName = formData.get("productName");
    const categoryId = formData.get("categoryId");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No image uploaded" }, { status: 400 });
    }

    // The image is filed under its category's folder, so the media library
    // mirrors the catalog. Resolving the slug from the id server-side means a
    // client can never steer a file into an arbitrary folder.
    if (typeof categoryId !== "string" || !categoryId.trim()) {
      return NextResponse.json(
        { error: "Choose a category before uploading images" },
        { status: 400 },
      );
    }

    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      select: { slug: true },
    });

    if (!category) {
      return NextResponse.json({ error: "Unknown category" }, { status: 400 });
    }

    const extension = allowedTypes.get(file.type);
    if (!extension) {
      return NextResponse.json(
        { error: "Invalid image type. Use JPEG, PNG, or WebP" },
        { status: 400 },
      );
    }

    if (file.size > maxFileSize) {
      return NextResponse.json(
        { error: "Image is too large. Maximum size is 10MB" },
        { status: 400 },
      );
    }

    const originalName = file.name.replace(/\.[^.]+$/, "");
    const baseName =
      toSafeFilename(
        typeof productName === "string" && productName.trim()
          ? productName
          : originalName,
      ) || "product-image";
    const filename = `${baseName}-${Date.now()}-${randomUUID().slice(0, 8)}${extension}`;

    const publicPath = publicAssetPath(productImageFolder(category.slug), filename);
    await uploadPublicAsset(
      publicPath,
      Buffer.from(await file.arrayBuffer()),
      file.type,
    );

    return NextResponse.json({
      url: publicPath,
      filename,
    });
  } catch (error) {
    console.error("Product image upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload product image" },
      { status: 500 },
    );
  }
}
