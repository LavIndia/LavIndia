/**
 * Uploading the shop's own logo.
 *
 * Kept apart from the product image upload because a logo is not a
 * photograph of a piece: it belongs in the brand's own folder, it is usually
 * vector, and it is one file rather than a set. Mixing it into the product
 * tree would put the brand mark in among the necklaces.
 */
import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { auth } from "@/lib/auth";
import { uploadPublicAsset } from "@/lib/imagekit-admin";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

/**
 * SVG first: a logo is drawn, not photographed, and a vector mark stays
 * crisp on a bill, a label and a shop sign alike. The raster types are
 * accepted because not every brand has its mark as vector.
 */
const allowedTypes = new Map([
  ["image/svg+xml", ".svg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
  ["image/jpeg", ".jpg"],
]);

const maxFileSize = 2 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (process.env.IMAGEKIT_ENABLED !== "true") {
    return NextResponse.json({ error: "Image storage is not configured" }, { status: 503 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No logo uploaded" }, { status: 400 });
  }

  const extension = allowedTypes.get(file.type);
  if (!extension) {
    return NextResponse.json(
      { error: "Use an SVG, PNG, WebP or JPEG file" },
      { status: 400 },
    );
  }

  if (file.size > maxFileSize) {
    return NextResponse.json({ error: "A logo must be under 2MB" }, { status: 400 });
  }

  // A fresh name every time. Overwriting one path would leave every browser
  // and CDN edge showing the old mark until its cache expired, which reads
  // as "the upload did not work".
  const publicPath = `/logos/${randomUUID()}${extension}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    await uploadPublicAsset(publicPath, buffer, file.type);
  } catch (cause) {
    console.error("Logo upload failed:", cause);
    return NextResponse.json({ error: "The logo could not be uploaded" }, { status: 502 });
  }

  const existing = await prisma.siteSettings.findFirst({ select: { id: true } });
  if (existing) {
    await prisma.siteSettings.update({
      where: { id: existing.id },
      data: { logoUrl: publicPath },
    });
  } else {
    await prisma.siteSettings.create({ data: { logoUrl: publicPath } });
  }

  await logAudit({
    adminId: session.user.id!,
    adminName: session.user.name || undefined,
    action: "UPDATE",
    entity: "SiteSettings",
    entityId: existing?.id ?? "new",
    metadata: { logoUrl: publicPath },
  });

  revalidateTag("site-settings");

  return NextResponse.json({ logoUrl: publicPath });
}

/**
 * Points the shop at a mark that is already stored.
 *
 * Separate from the upload because choosing one of the house marks moves no
 * bytes: the file is already there, and only which one is in use changes.
 */
export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { logoUrl?: unknown } | null;
  const logoUrl = typeof body?.logoUrl === "string" ? body.logoUrl.trim() : null;

  // Only ever a path inside our own asset folders. A full URL here would let
  // the header load a mark from somewhere nobody in the shop controls.
  if (!logoUrl || !/^\/(logos|assets)\/[A-Za-z0-9._\-/]+$/.test(logoUrl)) {
    return NextResponse.json({ error: "That is not a stored logo" }, { status: 400 });
  }

  const existing = await prisma.siteSettings.findFirst({ select: { id: true } });
  if (existing) {
    await prisma.siteSettings.update({ where: { id: existing.id }, data: { logoUrl } });
  } else {
    await prisma.siteSettings.create({ data: { logoUrl } });
  }

  await logAudit({
    adminId: session.user.id!,
    adminName: session.user.name || undefined,
    action: "UPDATE",
    entity: "SiteSettings",
    entityId: existing?.id ?? "new",
    metadata: { logoUrl },
  });

  revalidateTag("site-settings");

  return NextResponse.json({ logoUrl });
}

/** Puts the bundled default mark back. The uploaded file is left in place. */
export async function DELETE() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await prisma.siteSettings.findFirst({ select: { id: true } });
  if (existing) {
    await prisma.siteSettings.update({
      where: { id: existing.id },
      data: { logoUrl: null },
    });
  }

  revalidateTag("site-settings");

  return NextResponse.json({ logoUrl: null });
}
