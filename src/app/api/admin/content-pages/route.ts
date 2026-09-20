import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listContentPages } from "@/modules/marketing";

/** The admin's list of editable storefront pages. */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const pages = await listContentPages();
    return NextResponse.json({ pages });
  } catch (error) {
    console.error("Error listing content pages:", error);
    return NextResponse.json(
      { error: "Failed to load content pages" },
      { status: 500 },
    );
  }
}
