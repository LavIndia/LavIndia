import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const carouselDir = path.join(
      process.cwd(),
      "public",
      "assets",
      "pictures",
      "loginCoursels"
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
      { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" } }
    );
  } catch (error) {
    console.error("Error loading carousel images:", error);
    return NextResponse.json(
      { error: "Failed to load carousel images" },
      { status: 500 }
    );
  }
}
