import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { inventoryService } from "@/modules/inventory";
import { importProductRow } from "@/lib/product-import";

const bulkProductSchema = z.object({
  products: z.array(
    z.object({
      name: z.string().min(1),
      slug: z.string().min(1),
      description: z.string().optional().nullable(),
      priceCents: z.number().int().positive(),
      compareAtCents: z.number().int().positive().optional().nullable(),
      costCents: z.number().int().min(0).optional().nullable(),
      stock: z.number().int().min(0).default(0),
      categoryName: z.string().trim().min(1),
      sku: z.string().optional().nullable(),
      material: z.string().trim().max(120).optional().nullable(),
      tags: z.array(z.string()).max(30).default([]),
      isPublished: z.boolean().default(false),
      isFeatured: z.boolean().default(false),
      isLimitedEdition: z.boolean().default(false),
      discountPercent: z.number().int().min(0).max(100).optional().nullable(),
      variants: z.array(z.object({
        name: z.string().min(1),
        color: z.string().nullable().optional(),
        size: z.string().nullable().optional(),
        material: z.string().nullable().optional(),
        priceCents: z.number().int().positive().nullable().optional(),
        stock: z.number().int().min(0).default(0),
      })).optional(),
      images: z.array(z.object({
        url: z.string().min(1),
        alt: z.string().nullable().optional(),
        isPrimary: z.boolean().default(false),
        position: z.number().int().min(0).default(0),
        optionDimension: z.enum(["color", "size", "material"]).nullable().optional(),
        optionValue: z.string().min(1).nullable().optional(),
      })).optional(),
    })
  ),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { products } = bulkProductSchema.parse(body);

    let successCount = 0;
    let failedCount = 0;
    const errors: Array<{ row: number; error: string }> = [];

    // Resolved once for the whole file rather than once per row.
    const locationId = await inventoryService.getDefaultLocationId();

    // Each row is its own transaction: one bad row is reported, not fatal to
    // the rest. Within a row, the product, its Default variant (with SKU and
    // barcode) and its opening stock commit together — see product-import.
    for (let i = 0; i < products.length; i++) {
      try {
        await importProductRow(products[i], { actorId: session.user.id, locationId });
        successCount++;
      } catch (error) {
        failedCount++;
        errors.push({
          row: i + 1,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        adminId: session.user.id!,
        adminName: session.user.name || undefined,
        action: "CREATE",
        entity: "Product",
        metadata: {
          bulkUpload: true,
          totalRows: products.length,
          success: successCount,
          failed: failedCount,
        },
      },
    });

    if (successCount > 0) {
      revalidateTag("products");
      revalidateTag("homepage");
    }

    return NextResponse.json({
      success: successCount,
      failed: failedCount,
      errors,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Bulk upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload products" },
      { status: 500 }
    );
  }
}
