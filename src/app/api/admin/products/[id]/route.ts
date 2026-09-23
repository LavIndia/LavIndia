import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { auth } from "@/lib/auth";
import { removePublicAsset } from "@/lib/imagekit-admin";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { enforceVariantInvariants } from "@/modules/catalog";
import { VariantHasStockError } from "@/lib/product-variant-guards";
import { applyImageEdits, applyVariantEdits } from "@/lib/product-edit";

const imageInputSchema = z.object({
  id: z.string().optional(),
  url: z.string().min(1),
  alt: z.string().nullable().optional(),
  isPrimary: z.boolean().default(false),
  position: z.number().int().min(0).default(0),
  // The option value the image is filed under — ("color", "Gold") — or
  // both null for a general image shown with every variant. Photos belong
  // to an option value, not a variant: see catalog/images/image-groups.ts.
  optionDimension: z.enum(["color", "size", "material"]).nullable().optional(),
  optionValue: z.string().min(1).nullable().optional(),
});

const variantInputSchema = z.object({
  id: z.string().optional(),
  clientId: z.string().optional(),
  name: z.string().min(1),
  color: z.string().nullable().optional(),
  size: z.string().nullable().optional(),
  material: z.string().nullable().optional(),
  priceCents: z.number().int().positive().nullable().optional(),
  stock: z.number().int().min(0).default(0),
});

const productUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  priceCents: z.number().int().positive().optional(),
  compareAtCents: z.number().int().positive().optional().nullable(),
  costCents: z.number().int().min(0).optional().nullable(),
  discountPercent: z.number().int().min(0).max(100).optional().nullable(),
  stock: z.number().int().min(0).optional(),
  categoryId: z.string().optional(),
  sku: z.string().optional().nullable(),
  material: z.string().trim().max(120).optional().nullable(),
  isPublished: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  isLimitedEdition: z.boolean().optional(),
  isActive: z.boolean().optional(),
  // When present, the whole images/variants set is diffed against what's
  // in the DB and applied in one transaction — see PATCH below. This is
  // what lets the admin form save a full product edit as a single request
  // instead of a create/update-per-image/variant waterfall.
  images: z.array(imageInputSchema).optional(),
  variants: z.array(variantInputSchema).optional(),
});

// GET /api/admin/products/[id] - Get single product
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        images: {
          orderBy: { position: "asc" },
        },
        variants: true,
      },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error("Error fetching product:", error);
    return NextResponse.json(
      { error: "Failed to fetch product" },
      { status: 500 },
    );
  }
}

// PATCH /api/admin/products/[id] - Update product
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { images, variants, ...productFields } =
      productUpdateSchema.parse(body);

    const { removedImageUrls } = await prisma.$transaction(
      async (tx) => {
        await tx.product.update({ where: { id }, data: productFields });

        if (variants) {
          await applyVariantEdits(tx, id, variants);
          // Runs whenever the variant set was touched: a product left with no
          // variants gets its implicit Default back, and every new variant
          // leaves with a SKU and barcode.
          await enforceVariantInvariants(tx, id);
        }

        const removedImageUrls = images ? await applyImageEdits(tx, id, images) : [];

        return { removedImageUrls };
      },
      // See the note on the create route: the default five-second deadline is
      // not survivable from a serverless region to an out-of-region database
      // once a product carries a realistic number of images and variants.
      { timeout: 20_000, maxWait: 10_000 },
    );

    // Clean up ImageKit assets for images that were removed, outside the
    // DB transaction since this is an external network call.
    if (removedImageUrls.length) {
      const results = await Promise.allSettled(
        removedImageUrls
          .filter((url) => url.startsWith("/assets/"))
          .map((url) => removePublicAsset(url)),
      );
      results
        .filter(
          (r): r is PromiseRejectedResult => r.status === "rejected",
        )
        .forEach((r) =>
          console.error("Failed to remove product image from ImageKit:", r.reason),
        );
    }

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        images: { orderBy: { position: "asc" } },
        variants: true,
      },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        adminId: session.user.id!,
        adminName: session.user.name || undefined,
        action: "UPDATE",
        entity: "Product",
        entityId: product.id,
        metadata: {
          productName: product.name,
          changes: Object.keys(productFields),
        },
      },
    });

    revalidateTag("products");
    revalidateTag("homepage");

    return NextResponse.json(product);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 },
      );
    }
    if (error instanceof VariantHasStockError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Error updating product:", error);
    return NextResponse.json(
      { error: "Failed to update product" },
      { status: 500 },
    );
  }
}

// DELETE /api/admin/products/[id] - Delete product
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const product = await prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        images: { select: { url: true } },
        _count: { select: { orderItems: true } },
      },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    if (product._count.orderItems > 0) {
      await prisma.product.update({
        where: { id },
        data: { isActive: false, isPublished: false },
      });

      revalidateTag("products");
      revalidateTag("homepage");

      return NextResponse.json({
        archived: true,
        message: "Product archived because it has existing orders",
      });
    }

    await prisma.product.delete({
      where: { id },
    });

    const assetCleanup = await Promise.allSettled(
      product.images
        .filter((image) => image.url.startsWith("/assets/"))
        .map((image) => removePublicAsset(image.url)),
    );
    assetCleanup
      .filter(
        (result): result is PromiseRejectedResult =>
          result.status === "rejected",
      )
      .forEach((result) => {
        console.error(
          "Failed to remove product image from ImageKit:",
          result.reason,
        );
      });

    try {
      await prisma.auditLog.create({
        data: {
          adminId: session.user.id!,
          adminName: session.user.name || undefined,
          action: "DELETE",
          entity: "Product",
          entityId: product.id,
          metadata: { productName: product.name },
        },
      });
    } catch (auditError) {
      console.error(
        "Product deleted but audit log creation failed:",
        auditError,
      );
    }

    revalidateTag("products");
    revalidateTag("homepage");

    return NextResponse.json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Error deleting product:", error);
    return NextResponse.json(
      { error: "Failed to delete product" },
      { status: 500 },
    );
  }
}
