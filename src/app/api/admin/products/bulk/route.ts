import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const bulkProductSchema = z.object({
  products: z.array(
    z.object({
      name: z.string().min(1),
      slug: z.string().min(1),
      description: z.string().optional().nullable(),
      priceCents: z.number().int().positive(),
      compareAtCents: z.number().int().positive().optional().nullable(),
      stock: z.number().int().min(0),
      categoryId: z.string(),
      sku: z.string().optional().nullable(),
      isPublished: z.boolean().default(false),
      isFeatured: z.boolean().default(false),
      discountPercent: z.number().int().min(0).max(100).optional().nullable(),
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

    // Process products in transaction
    for (let i = 0; i < products.length; i++) {
      try {
        await prisma.product.create({
          data: products[i],
        });
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
