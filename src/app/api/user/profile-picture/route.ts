import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import path from "path";
import { removePublicAsset, uploadPublicAsset } from "@/lib/imagekit-admin";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.email && !session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only JPEG, PNG, and WebP are allowed" },
        { status: 400 },
      );
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 5MB" },
        { status: 400 },
      );
    }

    // Get user from database
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: session.user.email || undefined },
          { id: session.user.id || undefined },
        ],
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Create unique filename
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const ext = path.extname(file.name);
    const filename = `${user.id}-${Date.now()}${ext}`;

    // Update user profile picture in database
    const publicPath = `/assets/User/${filename}`;
    await uploadPublicAsset(publicPath, buffer, file.type);
    await prisma.user.update({
      where: { id: user.id },
      data: { profilePicture: publicPath },
    });

    return NextResponse.json({
      success: true,
      profilePicture: publicPath,
    });
  } catch (error) {
    console.error("Profile picture upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload profile picture" },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  try {
    const session = await auth();

    if (!session?.user?.email && !session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: session.user.email || undefined },
          { id: session.user.id || undefined },
        ],
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.profilePicture?.startsWith("/assets/")) {
      await removePublicAsset(user.profilePicture);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { profilePicture: null },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Profile picture delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete profile picture" },
      { status: 500 },
    );
  }
}
