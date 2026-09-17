import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { removePublicAsset } from "@/lib/imagekit-admin";

export async function GET() {
  try {
    const banners = await prisma.heroBanner.findMany({
      orderBy: { order: "asc" },
    });

    return NextResponse.json({ banners });
  } catch (error) {
    console.error("Error fetching hero banners:", error);
    return NextResponse.json(
      { error: "Failed to fetch hero banners" },
      { status: 500 },
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

    if (!title || !imagePath) {
      return NextResponse.json(
        { error: "Title and image are required" },
        { status: 400 },
      );
    }

    const banner = await prisma.heroBanner.create({
      data: {
        title,
        subtitle,
        imagePath,
        linkUrl,
        order: order ?? 0,
        active: active ?? true,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        isRecurring: isRecurring ?? false,
        recurrenceType: isRecurring ? recurrenceType : null,
        recurrenceDaysOfWeek: isRecurring ? recurrenceDaysOfWeek ?? [] : [],
        recurrenceDayOfMonth: isRecurring ? recurrenceDayOfMonth : null,
        recurrenceStartTime: isRecurring ? recurrenceStartTime : null,
        recurrenceEndTime: isRecurring ? recurrenceEndTime : null,
      },
    });

    await logAudit({
      adminId: session.user.id || "system",
      adminName: session.user.name || session.user.email || "Admin",
      action: "CREATE",
      entity: "HeroBanner",
      entityId: banner.id,
      metadata: { title: banner.title },
    });

    revalidateTag("homepage");

    return NextResponse.json({ banner });
  } catch (error) {
    console.error("Error creating hero banner:", error);
    return NextResponse.json(
      { error: "Failed to create hero banner" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const updates = Array.isArray(body.updates) ? body.updates : [];
    const validUpdates = updates.filter(
      (update: unknown): update is { id: string; linkUrl: string | null } =>
        typeof update === "object" &&
        update !== null &&
        typeof (update as { id?: unknown }).id === "string" &&
        ((update as { linkUrl?: unknown }).linkUrl === null ||
          typeof (update as { linkUrl?: unknown }).linkUrl === "string"),
    ) as Array<{ id: string; linkUrl: string | null }>;

    if (validUpdates.length === 0) {
      return NextResponse.json(
        { error: "No banner changes provided" },
        { status: 400 },
      );
    }

    await Promise.all(
      validUpdates.map((update) =>
        prisma.heroBanner.update({
          where: { id: update.id },
          data: { linkUrl: update.linkUrl },
        }),
      ),
    );

    revalidateTag("homepage");

    return NextResponse.json({ success: true, updated: validUpdates.length });
  } catch (error) {
    console.error("Error updating hero banners:", error);
    return NextResponse.json(
      { error: "Failed to update hero banners" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const ids = Array.isArray(body.ids)
      ? body.ids.filter((id: unknown): id is string => typeof id === "string")
      : [];

    if (ids.length === 0) {
      return NextResponse.json(
        { error: "Select at least one banner" },
        { status: 400 },
      );
    }

    const banners = await prisma.heroBanner.findMany({
      where: { id: { in: ids } },
    });

    await prisma.heroBanner.deleteMany({
      where: { id: { in: banners.map((banner) => banner.id) } },
    });

    await Promise.all(
      banners.map(async (banner) => {
        if (!banner.imagePath.startsWith("/assets/pictures/herobanner/")) {
          return;
        }

        try {
          await removePublicAsset(banner.imagePath);
        } catch (error: unknown) {
          console.error("Failed to remove hero banner image:", error);
        }
      }),
    );

    await Promise.all(
      banners.map((banner) =>
        logAudit({
          adminId: session.user.id || "system",
          adminName: session.user.name || session.user.email || "Admin",
          action: "DELETE",
          entity: "HeroBanner",
          entityId: banner.id,
          metadata: { title: banner.title, bulk: true },
        }),
      ),
    );

    revalidateTag("homepage");

    return NextResponse.json({ success: true, deleted: banners.length });
  } catch (error) {
    console.error("Error deleting hero banners:", error);
    return NextResponse.json(
      { error: "Failed to delete hero banners" },
      { status: 500 },
    );
  }
}
