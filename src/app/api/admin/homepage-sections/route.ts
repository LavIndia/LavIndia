import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sections = await prisma.homePageSection.findMany({
      orderBy: { order: "asc" },
    });

    return NextResponse.json({ sections });
  } catch (error) {
    console.error("Error fetching homepage sections:", error);
    return NextResponse.json(
      { error: "Failed to fetch homepage sections" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, title, isVisible, order } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Section name is required" },
        { status: 400 }
      );
    }

    const section = await prisma.homePageSection.create({
      data: {
        name,
        title,
        isVisible: isVisible ?? true,
        order: order ?? 0,
      },
    });

    await logAudit({
      adminId: session.user.id || "system",
      adminName: session.user.name || session.user.email || "Admin",
      action: "CREATE",
      entity: "HomePageSection",
      entityId: section.id,
      metadata: { name: section.name },
    });

    revalidateTag("homepage");

    return NextResponse.json({ section });
  } catch (error) {
    console.error("Error creating homepage section:", error);
    return NextResponse.json(
      { error: "Failed to create homepage section" },
      { status: 500 }
    );
  }
}
