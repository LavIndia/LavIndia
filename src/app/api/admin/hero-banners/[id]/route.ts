import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { removePublicAsset } from "@/lib/imagekit-admin";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const banner = await prisma.heroBanner.findUnique({
      where: { id },
    });

    if (!banner) {
      return NextResponse.json(
        { error: "Hero banner not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ banner });
  } catch (error) {
    console.error("Error fetching hero banner:", error);
    return NextResponse.json(
      { error: "Failed to fetch hero banner" },
      { status: 500 }
    );
  }
}

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
    const {
      title,
      subtitle,
      imagePath,
      linkUrl,
      order,
      active,
      startDate,
      endDate,
      isRecurring,
      recurrenceType,
      recurrenceDaysOfWeek,
      recurrenceDayOfMonth,
      recurrenceStartTime,
      recurrenceEndTime,
    } = body;

    const banner = await prisma.heroBanner.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(subtitle !== undefined && { subtitle }),
        ...(imagePath !== undefined && { imagePath }),
        ...(linkUrl !== undefined && { linkUrl }),
        ...(order !== undefined && { order }),
        ...(active !== undefined && { active }),
        ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
        ...(isRecurring !== undefined && { isRecurring }),
        ...(recurrenceType !== undefined && { recurrenceType: isRecurring ? recurrenceType : null }),
        ...(recurrenceDaysOfWeek !== undefined && {
          recurrenceDaysOfWeek: isRecurring ? recurrenceDaysOfWeek : [],
        }),
        ...(recurrenceDayOfMonth !== undefined && {
          recurrenceDayOfMonth: isRecurring ? recurrenceDayOfMonth : null,
        }),
        ...(recurrenceStartTime !== undefined && {
          recurrenceStartTime: isRecurring ? recurrenceStartTime : null,
        }),
        ...(recurrenceEndTime !== undefined && {
          recurrenceEndTime: isRecurring ? recurrenceEndTime : null,
        }),
      },
    });

    await logAudit({
      adminId: session.user.id || "system",
      adminName: session.user.name || session.user.email || "Admin",
      action: "UPDATE",
      entity: "HeroBanner",
      entityId: banner.id,
      metadata: { title: banner.title },
    });

    revalidateTag("homepage");

    return NextResponse.json({ banner });
  } catch (error) {
    console.error("Error updating hero banner:", error);
    return NextResponse.json(
      { error: "Failed to update hero banner" },
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

    const banner = await prisma.heroBanner.delete({
      where: { id },
    });

    if (banner.imagePath.startsWith("/assets/pictures/herobanner/")) {
      try {
        await removePublicAsset(banner.imagePath);
      } catch (error: unknown) {
        console.error("Failed to remove hero banner image:", error);
      }
    }

    await logAudit({
      adminId: session.user.id || "system",
      adminName: session.user.name || session.user.email || "Admin",
      action: "DELETE",
      entity: "HeroBanner",
      entityId: banner.id,
      metadata: { title: banner.title },
    });

    revalidateTag("homepage");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting hero banner:", error);
    return NextResponse.json(
      { error: "Failed to delete hero banner" },
      { status: 500 }
    );
  }
}
