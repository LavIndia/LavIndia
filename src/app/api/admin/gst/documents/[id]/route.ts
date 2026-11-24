import { NextRequest, NextResponse } from "next/server";
import { apiHandler } from "@/lib/api-handler";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { DomainError } from "@/modules/_shared/errors";
import { gstActor } from "../../_shared";

export const dynamic = "force-dynamic";

// GET /api/admin/gst/documents/[id] — download the file. Always as an attachment, never rendered by the browser.
export const GET = apiHandler(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  await gstActor("gst:read");
  const { id } = await params;
  const doc = await prisma.gstSupplierDocument.findUnique({ where: { id } });
  if (!doc) throw new DomainError("NOT_FOUND", "That document does not exist");
  return new NextResponse(new Uint8Array(doc.content), {
    headers: {
      "content-type": doc.mimeType,
      "content-disposition": `attachment; filename="${doc.fileName.replace(/"/g, "")}"`,
      "x-content-type-options": "nosniff",
      "cache-control": "private, no-store",
    },
  });
});

// DELETE /api/admin/gst/documents/[id] — remove a wrongly uploaded paper
export const DELETE = apiHandler(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { admin } = await gstActor("gst:write");
  const { id } = await params;
  const doc = await prisma.gstSupplierDocument.findUnique({ where: { id }, select: { id: true, fileName: true, sha256: true } });
  if (!doc) throw new DomainError("NOT_FOUND", "That document does not exist");
  await prisma.gstSupplierDocument.delete({ where: { id } });
  await createAuditLog({ adminId: admin.id, adminName: admin.name ?? undefined, action: "GST_DOCUMENT_DELETED", entity: "GstSupplierDocument", entityId: id, metadata: { fileName: doc.fileName, sha256: doc.sha256 } });
  return NextResponse.json({ deleted: true });
});
