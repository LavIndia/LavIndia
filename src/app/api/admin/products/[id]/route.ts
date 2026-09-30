import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { auth } from "@/lib/auth";
import { removePublicAsset } from "@/lib/imagekit-admin";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { deleteProduct, enforceVariantInvariants, normaliseTags, setProductRetired } from "@/modules/catalog";
import { isDomainError, toErrorResponse } from "@/modules/_shared/errors";
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
  // Normalised on the way in, so "Festive Edit" and "festive-edit" are one tag.
  tags: z
    .array(z.string())
    .max(30)
    .optional()
    .transform((t) => (t ? normaliseTags(t) : undefined)),
  // Retire (true) or reinstate (false). Stored as a timestamp, so it is
  // applied through the catalog rather than written as a column value.
  retired: z.boolean().optional(),
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
    const { images, variants, retired, ...productFields } =
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

    // After the edit commits, so a retirement that finds the piece sold out
    // unpublishes it rather than being overwritten by the form's isPublished.
    if (retired !== undefined) await setProductRetired(id, retired);

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
          changes: [
            ...Object.keys(productFields),
            ...(retired !== undefined ? [retired ? "retired" : "reinstated"] : []),
          ],
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
//
// A product that has been sold is only deleted with `?force=1`. Without it
// the request is refused with PRODUCT_HAS_ORDERS and the number of order
// lines, so the admin screen can offer Retire as the gentler alternative.
// Either way every order, invoice and stock movement that mentions the
// product is kept — see catalog/products/product-lifecycle.ts.
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
    const force = req.nextUrl.searchParams.get("force") === "1";

    const deletion = await deleteProduct(id, { force });

    const assetCleanup = await Promise.allSettled(
      deletion.imageUrls
        .filter((url) => url.startsWith("/assets/"))
        .map((url) => removePublicAsset(url)),
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
          entityId: deletion.productId,
          metadata: {
            productName: deletion.productName,
            forced: force,
            orderLinesKept: deletion.orderLineCount,
          },
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

    return NextResponse.json({
      message: "Product deleted successfully",
      orderLinesKept: deletion.orderLineCount,
    });
  } catch (error) {
    if (isDomainError(error)) {
      const { body, status } = toErrorResponse(error);
      return NextResponse.json(body, { status });
    }
    console.error("Error deleting product:", error);
    return NextResponse.json(
      { error: "Failed to delete product" },
      { status: 500 },
    );
  }
}
