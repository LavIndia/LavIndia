import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { isValidVpa } from "@/modules/payments/upi/upi-link";

const settingsSchema = z.object({
  businessName: z.string().min(1),
  address: z.string().optional().nullable(),
  contactNumber: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  gstNumber: z.string().optional().nullable(),
  // UPI collection details. Validated as a VPA rather than free text, because
  // a malformed one silently produces a QR that pays nobody.
  upiVpa: z
    .string()
    .trim()
    .optional()
    .nullable()
    .refine((value) => !value || isValidVpa(value), {
      message: "That does not look like a valid UPI ID, e.g. yourname@okhdfcbank",
    }),
  upiPayeeName: z.string().trim().max(120).optional().nullable(),
  facebook: z.string().url().optional().nullable().or(z.literal("")),
  instagram: z.string().url().optional().nullable().or(z.literal("")),
  twitter: z.string().url().optional().nullable().or(z.literal("")),
  linkedin: z.string().url().optional().nullable().or(z.literal("")),
  amazonLink: z.string().url().optional().nullable().or(z.literal("")),
  flipkartLink: z.string().url().optional().nullable().or(z.literal("")),
  myntraLink: z.string().url().optional().nullable().or(z.literal("")),
  blinkitLink: z.string().url().optional().nullable().or(z.literal("")),
  zeptoLink: z.string().url().optional().nullable().or(z.literal("")),
});

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

    return NextResponse.json(settings);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error updating settings:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
