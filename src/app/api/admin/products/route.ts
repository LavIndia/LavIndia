import { normaliseTags } from "@/modules/catalog";
import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { listAdminProducts } from "@/lib/admin-product-list";
import { z } from "zod";
import { createProductInTx } from "@/modules/catalog";

const PRODUCTS_PAGE_SIZE = 20;

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

const productSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional().nullable(),
  priceCents: z.number().int().positive(),
  compareAtCents: z.number().int().positive().optional().nullable(),
  // The buying price. Never shown to a customer; it is what margin is
  // worked out from.
  costCents: z.number().int().min(0).optional().nullable(),
  discountPercent: z.number().int().min(0).max(100).optional().nullable(),
  stock: z.number().int().min(0),
  categoryId: z.string(),
  sku: z.string().optional().nullable(),
  material: z.string().trim().max(120).optional().nullable(),
  tags: z
    .array(z.string())
    .max(30)
    .optional()
    .transform((t) => (t ? normaliseTags(t) : undefined)),
  isPublished: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
  isLimitedEdition: z.boolean().default(false),
  // Nested creation, so a new product (with its images/variants) is a
  // single request instead of the create-then-N-sequential-saves waterfall
  // the admin product form used to do.
  images: z.array(imageInputSchema).optional(),
  variants: z.array(variantInputSchema).optional(),
});

// GET /api/admin/products - List products, optionally filtered by category/search
// and paginated. With no query params this returns every product (unfiltered,
// unpaginated), matching the original behavior of this endpoint.
export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = req.nextUrl;
    const categoryId = searchParams.get("categoryId");
    const search = searchParams.get("search");
    const sort = searchParams.get("sort");
    const pageParam = searchParams.get("page");

    // Pagination only kicks in when a page is explicitly requested, so this
    // endpoint's default (no params) response shape is unchanged for any
    // existing caller.
    const page = pageParam ? Math.max(1, parseInt(pageParam, 10) || 1) : null;

    // Same search (variant SKUs included), sort (stock ranked before paging)
    // and stock figures (from Inventory) as Admin › Products.
    const { products, totalCount } = await listAdminProducts(
      { search, categoryId, sort, page, pageSize: PRODUCTS_PAGE_SIZE },
      (args) =>
        prisma.product.findMany({
          ...args,
          include: {
            category: true,
            images: page ? { where: { isPrimary: true }, take: 1 } : true,
            variants: true,
          },
        }),
    );

    if (!page) {
      return NextResponse.json(products);
    }

    return NextResponse.json({
      products,
      pagination: {
        page,
        pageSize: PRODUCTS_PAGE_SIZE,
        totalCount,
        totalPages: Math.max(1, Math.ceil(totalCount / PRODUCTS_PAGE_SIZE)),
      },
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}

// POST /api/admin/products - Create new product
export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { images, variants, ...validatedData } = productSchema.parse(body);

    const product = await prisma.$transaction(
      async (tx) => {
        // The one creation path the bulk upload shares: product, variants,
        // images and the variant invariants, in this transaction.
        const created = await createProductInTx(tx, {
          product: validatedData,
          variants,
          images,
        });

        return tx.product.findUniqueOrThrow({
          where: { id: created.id },
          include: { category: true, images: true, variants: true },
        });
      },
      // Prisma's default interactive-transaction deadline is five seconds,
      // which is ample locally and not ample at all from a serverless region
      // to a database on another continent. Saving a product with images and
      // variants is the heaviest write the admin performs, so it is given the
      // same headroom as the other multi-step writes in this codebase.
      { timeout: 20_000, maxWait: 10_000 },
    );

    // Create audit log
    await prisma.auditLog.create({
      data: {
        adminId: session.user.id!,
        adminName: session.user.name || undefined,
        action: "CREATE",
        entity: "Product",
        entityId: product.id,
        metadata: { productName: product.name },
      },
    });

    revalidateTag("products");
    revalidateTag("homepage");

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error creating product:", error);
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 }
    );
  }
}
