import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
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

    const discount = await prisma.discount.update({
      where: { id },
      data: {
        ...(body.code && { code: body.code.toUpperCase() }),
        ...(body.title && { title: body.title }),
        ...(body.description !== undefined && {
          description: body.description,
        }),
        ...(body.discountType && { discountType: body.discountType }),
        ...(body.discountValue !== undefined && {
          discountValue: body.discountValue,
        }),
        ...(body.minPurchase !== undefined && {
          minPurchase: body.minPurchase,
        }),
        ...(body.maxDiscount !== undefined && {
          maxDiscount: body.maxDiscount,
        }),
        ...(body.startDate && { startDate: new Date(body.startDate) }),
        ...(body.endDate && { endDate: new Date(body.endDate) }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
        ...(body.usageLimit !== undefined && { usageLimit: body.usageLimit }),
        ...(body.isRecurring !== undefined && { isRecurring: body.isRecurring }),
        ...(body.recurrenceType !== undefined && { recurrenceType: body.recurrenceType }),
        ...(body.recurrenceDaysOfWeek !== undefined && {
          recurrenceDaysOfWeek: body.recurrenceDaysOfWeek,
        }),
        ...(body.recurrenceDayOfMonth !== undefined && {
          recurrenceDayOfMonth: body.recurrenceDayOfMonth,
        }),
        ...(body.recurrenceStartTime !== undefined && {
          recurrenceStartTime: body.recurrenceStartTime,
        }),
        ...(body.recurrenceEndTime !== undefined && {
          recurrenceEndTime: body.recurrenceEndTime,
        }),
      },
    });

    await logAudit({
      adminId: session.user.id || "system",
      adminName: session.user.name || session.user.email || "Admin",
      action: "UPDATE",
      entity: "Discount",
      entityId: discount.id,
      metadata: { code: discount.code },
    });

    revalidateTag("homepage");

    return NextResponse.json({ discount });
  } catch (error) {
    console.error("Error updating discount:", error);
    return NextResponse.json(
      { error: "Failed to update discount" },
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

    const discount = await prisma.discount.delete({
      where: { id },
    });

    await logAudit({
      adminId: session.user.id || "system",
      adminName: session.user.name || session.user.email || "Admin",
      action: "DELETE",
      entity: "Discount",
      entityId: discount.id,
      metadata: { code: discount.code },
    });

    revalidateTag("homepage");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting discount:", error);
    return NextResponse.json(
      { error: "Failed to delete discount" },
      { status: 500 }
    );
  }
}
