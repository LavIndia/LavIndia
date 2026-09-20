import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { enforceVariantInvariants } from "@/modules/catalog";

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
  discountPercent: z.number().int().min(0).max(100).optional().nullable(),
  stock: z.number().int().min(0),
  categoryId: z.string(),
  sku: z.string().optional().nullable(),
  material: z.string().trim().max(120).optional().nullable(),
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

    const where: Prisma.ProductWhereInput = {};
    if (categoryId) where.categoryId = categoryId;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { sku: { contains: search, mode: "insensitive" } },
      ];
    }

    let orderBy: Prisma.ProductOrderByWithRelationInput = { createdAt: "desc" };
    if (sort === "name_asc") orderBy = { name: "asc" };
    if (sort === "name_desc") orderBy = { name: "desc" };
    if (sort === "price_asc") orderBy = { priceCents: "asc" };
    if (sort === "price_desc") orderBy = { priceCents: "desc" };
    if (sort === "stock_asc") orderBy = { stock: "asc" };
    if (sort === "stock_desc") orderBy = { stock: "desc" };

    // Pagination only kicks in when a page is explicitly requested, so this
    // endpoint's default (no params) response shape is unchanged for any
    // existing caller.
    const page = pageParam ? Math.max(1, parseInt(pageParam, 10) || 1) : null;

    const [products, totalCount] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy,
        include: {
          category: true,
          images: page ? { where: { isPrimary: true }, take: 1 } : true,
          variants: true,
        },
        ...(page ? { skip: (page - 1) * PRODUCTS_PAGE_SIZE, take: PRODUCTS_PAGE_SIZE } : {}),
      }),
      prisma.product.count({ where }),
    ]);

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

    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({ data: validatedData });

      if (variants?.length) {
        await Promise.all(
          variants.map((v) => {
            const { id: _id, clientId: _clientId, ...rest } = v;
            return tx.productVariant.create({ data: { ...rest, productId: created.id } });
          }),
        );
      }

      if (images?.length) {
        await Promise.all(
          images.map((img) => {
            const { id: _id, optionDimension, optionValue, ...rest } = img;
            // A group needs both halves; anything less is a general image.
            const grouped = optionDimension && optionValue;
            return tx.productImage.create({
              data: {
                ...rest,
                productId: created.id,
                optionDimension: grouped ? optionDimension : null,
                optionValue: grouped ? optionValue : null,
              },
            });
          }),
        );
      }

      // Last, so a product with no options gets its implicit Default
      // variant and every variant leaves here with a SKU and barcode.
      await enforceVariantInvariants(tx, created.id);

      return tx.product.findUniqueOrThrow({
        where: { id: created.id },
        include: { category: true, images: true, variants: true },
      });
    });

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
