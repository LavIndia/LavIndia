import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { settingsSchema, settingsErrorMessage, tierOrderProblem } from "./settings-schema";
import { DEFAULT_TIER_THRESHOLDS, tierThresholdsFrom } from "@/modules/customers/customer-tier";

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = settingsSchema.parse(body);

    // Convert empty strings to null for URL fields
    const data = {
      ...validatedData,
      facebook: validatedData.facebook || null,
      instagram: validatedData.instagram || null,
      twitter: validatedData.twitter || null,
      linkedin: validatedData.linkedin || null,
      amazonLink: validatedData.amazonLink || null,
      flipkartLink: validatedData.flipkartLink || null,
      myntraLink: validatedData.myntraLink || null,
      blinkitLink: validatedData.blinkitLink || null,
      zeptoLink: validatedData.zeptoLink || null,
    };

    // Get first settings record or create if doesn't exist
    const existingSettings = await prisma.siteSettings.findFirst();

    // Tiers out of order would leave one empty; a tier not being changed is
    // checked as it is stored.
    const tierProblem = tierOrderProblem(
      validatedData,
      existingSettings ? tierThresholdsFrom(existingSettings) : DEFAULT_TIER_THRESHOLDS,
    );
    if (tierProblem) {
      return NextResponse.json({ error: tierProblem }, { status: 400 });
    }

    let settings;
    if (existingSettings) {
      settings = await prisma.siteSettings.update({
        where: { id: existingSettings.id },
        data,
      });
    } else {
      settings = await prisma.siteSettings.create({ data });
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        adminId: session.user.id!,
        adminName: session.user.name || undefined,
        action: "UPDATE",
        entity: "SiteSettings",
        entityId: settings.id,
        metadata: { changes: Object.keys(validatedData) },
      },
    });

    revalidateTag("site-settings");
    revalidateTag("homepage");
    // Delivery rates and GST treatment price every cart.
    revalidateTag("promotions");

    return NextResponse.json(settings);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: settingsErrorMessage(error), details: error.errors },
        { status: 400 },
      );
    }

    console.error("Error updating settings:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
