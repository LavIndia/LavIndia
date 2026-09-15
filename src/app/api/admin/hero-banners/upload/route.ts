import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { uploadPublicAsset } from "@/lib/imagekit-admin";

const publicDirectory = "/assets/pictures/herobanner";
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
    const requestedName = formData.get("title");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No image uploaded" }, { status: 400 });
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
        typeof requestedName === "string" && requestedName.trim()
          ? requestedName
          : originalName,
      ) || "hero-banner";
    const filename = `${baseName}-${Date.now()}-${randomUUID().slice(0, 8)}${extension}`;
    const publicPath = `${publicDirectory}/${filename}`;
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
    console.error("Hero banner upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload hero banner image" },
      { status: 500 },
    );
  }
}
