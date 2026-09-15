import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const section = await prisma.homePageSection.update({
      where: { id },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.isVisible !== undefined && { isVisible: body.isVisible }),
        ...(body.order !== undefined && { order: body.order }),
      },
    });

    await logAudit({
      adminId: session.user.id || "system",
      adminName: session.user.name || session.user.email || "Admin",
      action: "UPDATE",
      entity: "HomePageSection",
      entityId: section.id,
      metadata: { name: section.name },
    });

    return NextResponse.json({ section });
  } catch (error) {
    console.error("Error updating homepage section:", error);
    return NextResponse.json(
      { error: "Failed to update homepage section" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const section = await prisma.homePageSection.delete({
      where: { id },
    });

    await logAudit({
      adminId: session.user.id || "system",
      adminName: session.user.name || session.user.email || "Admin",
      action: "DELETE",
      entity: "HomePageSection",
      entityId: section.id,
      metadata: { name: section.name },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting homepage section:", error);
    return NextResponse.json(
      { error: "Failed to delete homepage section" },
      { status: 500 }
    );
  }
}
