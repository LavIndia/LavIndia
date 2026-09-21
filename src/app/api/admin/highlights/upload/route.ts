import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { uploadPublicAsset } from "@/lib/imagekit-admin";

/**
 * Storage for highlight media.
 *
 * Its own folder, apart from the hero banners: nothing scans this one and
 * turns its contents into rows, so images may sit here freely. Video is
 * accepted already, because the highlight carries its medium and the only
 * thing standing between an image gallery and a film gallery should be an
 * admin uploading a film.
 */
const publicDirectory = "/assets/pictures/highlights";

const allowedTypes = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
  ["video/mp4", ".mp4"],
  ["video/webm", ".webm"],
]);

/** Film is bigger than a photograph, so the ceiling depends on the medium. */
const maxSizeByKind = { image: 10 * 1024 * 1024, video: 50 * 1024 * 1024 };

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
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const extension = allowedTypes.get(file.type);
    if (!extension) {
      return NextResponse.json(
        { error: "Invalid file type. Use JPEG, PNG, WebP, MP4 or WebM" },
        { status: 400 },
      );
    }

    const isVideo = file.type.startsWith("video/");
    const limit = isVideo ? maxSizeByKind.video : maxSizeByKind.image;
    if (file.size > limit) {
      return NextResponse.json(
        { error: `File is too large. Maximum size is ${limit / (1024 * 1024)}MB` },
        { status: 400 },
      );
    }

    const originalName = file.name.replace(/\.[^.]+$/, "");
    const baseName =
      toSafeFilename(
        typeof requestedName === "string" && requestedName.trim()
          ? requestedName
          : originalName,
      ) || "highlight";
    const filename = `${baseName}-${Date.now()}-${randomUUID().slice(0, 8)}${extension}`;
    const publicPath = `${publicDirectory}/${filename}`;

    await uploadPublicAsset(
      publicPath,
      Buffer.from(await file.arrayBuffer()),
      file.type,
    );

    // The form needs to know which it got, so it can set the media type
    // without asking the admin to restate what they just uploaded.
    return NextResponse.json({
      url: publicPath,
      filename,
      mediaType: isVideo ? "VIDEO" : "IMAGE",
    });
  } catch (error) {
    console.error("Highlight upload error:", error);
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
  }
}
