import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listPublicAssets, removePublicAsset } from "@/lib/imagekit-admin";
import { logAudit } from "@/lib/audit";

const publicDirectory = "/assets/pictures/loginCoursels";
const imageExtensions = [".jpg", ".jpeg", ".png", ".webp", ".gif"];

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (process.env.IMAGEKIT_ENABLED !== "true") {
      return NextResponse.json(
        { error: "Image storage is not configured" },
        { status: 503 },
      );
    }

    const files = await listPublicAssets(publicDirectory);
    const images = files
      .filter((file) =>
        imageExtensions.includes(path.extname(file).toLowerCase()),
      )
      .map((file) => ({
        filename: file,
        publicPath: `${publicDirectory}/${file}`,
      }));

    return NextResponse.json({ images });
  } catch (error) {
    console.error("Error listing auth carousel images:", error);
    return NextResponse.json(
      { error: "Failed to load login screen images" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (process.env.IMAGEKIT_ENABLED !== "true") {
      return NextResponse.json(
        { error: "Image storage is not configured" },
        { status: 503 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const rawFilename =
      typeof body?.filename === "string" ? body.filename : null;
    const rawPublicPath =
      typeof body?.publicPath === "string" ? body.publicPath : null;

    if (!rawFilename && !rawPublicPath) {
      return NextResponse.json(
        { error: "A filename or publicPath is required" },
        { status: 400 },
      );
    }

    const filename = rawFilename
      ? path.basename(rawFilename)
      : path.basename(rawPublicPath as string);
    const publicPath = `${publicDirectory}/${filename}`;

    await removePublicAsset(publicPath);

    await logAudit({
      adminId: session.user.id || "system",
      adminName: session.user.name || session.user.email || "Admin",
      action: "DELETE",
      entity: "AuthCarouselImage",
      entityId: publicPath,
      metadata: { filename },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting auth carousel image:", error);
    return NextResponse.json(
      { error: "Failed to delete login screen image" },
      { status: 500 },
    );
  }
}
