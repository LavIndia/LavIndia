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

    const banner = await prisma.promoBanner.update({
      where: { id },
      data: {
        ...(body.type && { type: body.type }),
        ...(body.title !== undefined && { title: body.title }),
        ...(body.message && { message: body.message }),
        ...(body.bgColor !== undefined && { bgColor: body.bgColor }),
        ...(body.textColor !== undefined && { textColor: body.textColor }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
        ...(body.startDate !== undefined && {
          startDate: body.startDate ? new Date(body.startDate) : null,
        }),
        ...(body.endDate !== undefined && {
          endDate: body.endDate ? new Date(body.endDate) : null,
        }),
        ...(body.order !== undefined && { order: body.order }),
        ...(body.isRecurring !== undefined && { isRecurring: body.isRecurring }),
        ...(body.recurrenceType !== undefined && {
          recurrenceType: body.isRecurring ? body.recurrenceType : null,
        }),
        ...(body.recurrenceDaysOfWeek !== undefined && {
          recurrenceDaysOfWeek: body.isRecurring ? body.recurrenceDaysOfWeek : [],
        }),
        ...(body.recurrenceDayOfMonth !== undefined && {
          recurrenceDayOfMonth: body.isRecurring ? body.recurrenceDayOfMonth : null,
        }),
        ...(body.recurrenceStartTime !== undefined && {
          recurrenceStartTime: body.isRecurring ? body.recurrenceStartTime : null,
        }),
        ...(body.recurrenceEndTime !== undefined && {
          recurrenceEndTime: body.isRecurring ? body.recurrenceEndTime : null,
        }),
      },
    });

    await logAudit({
      adminId: session.user.id || "system",
      adminName: session.user.name || session.user.email || "Admin",
      action: "UPDATE",
      entity: "PromoBanner",
      entityId: banner.id,
      metadata: { type: banner.type },
    });

    return NextResponse.json({ banner });
  } catch (error) {
    console.error("Error updating promo banner:", error);
    return NextResponse.json(
      { error: "Failed to update promo banner" },
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

    const banner = await prisma.promoBanner.delete({
      where: { id },
    });

    await logAudit({
      adminId: session.user.id || "system",
      adminName: session.user.name || session.user.email || "Admin",
      action: "DELETE",
      entity: "PromoBanner",
      entityId: banner.id,
      metadata: { type: banner.type },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting promo banner:", error);
    return NextResponse.json(
      { error: "Failed to delete promo banner" },
      { status: 500 }
    );
  }
}
