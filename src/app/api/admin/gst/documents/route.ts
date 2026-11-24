import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { apiHandler } from "@/lib/api-handler";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { DomainError } from "@/modules/_shared/errors";
import { gstActor } from "../_shared";

export const dynamic = "force-dynamic";

const MAX_BYTES = 5 * 1024 * 1024;

/** The kind of file the bytes really are, whatever the browser called it. */
function sniff(bytes: Buffer): "application/pdf" | "image/jpeg" | "image/png" | null {
  if (bytes.subarray(0, 5).toString("latin1") === "%PDF-") return "application/pdf";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  return null;
}

// GET /api/admin/gst/documents — the supplier papers kept as evidence (without the files themselves)
export const GET = apiHandler(async () => {
  await gstActor("gst:read");
  const documents = await prisma.gstSupplierDocument.findMany({
    select: { id: true, productIds: true, supplierName: true, invoiceNumber: true, invoiceDate: true, fileName: true, mimeType: true, sizeBytes: true, notes: true, uploadedBy: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return NextResponse.json({ documents });
});

// POST /api/admin/gst/documents — upload a supplier invoice (PDF, JPEG or PNG, up to 5 MB)
export const POST = apiHandler(async (req: NextRequest) => {
  const { admin } = await gstActor("gst:write");
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) throw new DomainError("VALIDATION_FAILED", "Choose a file to upload");
  if (file.size === 0 || file.size > MAX_BYTES) throw new DomainError("VALIDATION_FAILED", "The file must be between 1 byte and 5 MB");
  const bytes = Buffer.from(await file.arrayBuffer());
  const kind = sniff(bytes);
  if (!kind) throw new DomainError("VALIDATION_FAILED", "Only PDF, JPEG or PNG files can be kept");

  const supplierName = String(form.get("supplierName") ?? "").trim();
  if (!supplierName) throw new DomainError("VALIDATION_FAILED", "Name the supplier");
  const date = String(form.get("invoiceDate") ?? "");
  const productIds = String(form.get("productIds") ?? "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 100);

  const row = await prisma.gstSupplierDocument.create({
    data: {
      supplierName: supplierName.slice(0, 200),
      invoiceNumber: String(form.get("invoiceNumber") ?? "").trim().slice(0, 80) || null,
      invoiceDate: /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(`${date}T00:00:00.000Z`) : null,
      productIds,
      fileName: file.name.replace(/[^\w.\- ]+/g, "_").slice(0, 120) || "document",
      mimeType: kind,
      sizeBytes: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      content: bytes,
      notes: String(form.get("notes") ?? "").trim().slice(0, 500) || null,
      uploadedBy: admin.id,
    },
    select: { id: true, fileName: true, sizeBytes: true },
  });
  await createAuditLog({ adminId: admin.id, adminName: admin.name ?? undefined, action: "GST_DOCUMENT_UPLOADED", entity: "GstSupplierDocument", entityId: row.id, metadata: { supplierName, products: productIds.length } });
  return NextResponse.json(row, { status: 201 });
});
