import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getHeroBannerDestinations } from "@/lib/hero-banner-destinations";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const destinations = await getHeroBannerDestinations();
    return NextResponse.json({ destinations });
  } catch (error) {
    console.error("Error fetching hero banner destinations:", error);
    return NextResponse.json(
      { error: "Failed to fetch banner destinations" },
      { status: 500 },
    );
  }
}
