import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { listPublicAssets } from "@/lib/imagekit-admin";

export async function GET() {
  try {
    if (process.env.IMAGEKIT_ENABLED === "true") {
      const files = await listPublicAssets("/assets/pictures/loginCoursels");
      const imageFiles = files
        .filter((file) =>
          [".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(
            path.extname(file).toLowerCase(),
          ),
        )
        .map((file) => `/assets/pictures/loginCoursels/${file}`);

      return NextResponse.json(
        { images: imageFiles },
        {
          headers: {
            "Cache-Control": "no-store",
          },
        },
      );
    }

    const carouselDir = path.join(
      process.cwd(),
      "public",
      "assets",
      "pictures",
      "loginCoursels",
    );

    // Read all files from the loginCoursels directory
    const files = fs.readdirSync(carouselDir);

    // Filter for image files and create full paths
    const imageFiles = files
      .filter((file) => {
        const ext = path.extname(file).toLowerCase();
        return [".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext);
      })
      .map((file) => `/assets/pictures/loginCoursels/${file}`);

    return NextResponse.json(
      { images: imageFiles },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error("Error loading carousel images:", error);
    return NextResponse.json(
      { error: "Failed to load carousel images" },
      { status: 500 },
    );
  }
}
