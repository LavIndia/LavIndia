import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "30");
    const priceMin = searchParams.get("price_min")
      ? parseInt(searchParams.get("price_min")!)
      : undefined;
    const priceMax = searchParams.get("price_max")
      ? parseInt(searchParams.get("price_max")!)
      : undefined;
    const maxPrice = searchParams.get("maxPrice")
      ? parseInt(searchParams.get("maxPrice")!)
      : undefined;
    const color = searchParams.get("color");
    const attrParam = searchParams.get("attr"); // comma-separated filter option values (metal, stone, etc.)
    const attrValues = attrParam
      ? attrParam.split(",").map((v) => v.trim()).filter(Boolean)
      : [];
    const category = searchParams.get("category");
    const categoryId = searchParams.get("categoryId");
    const sortBy = searchParams.get("sort") || "createdAt";
    const sortOrder = searchParams.get("order") === "asc" ? "asc" : "desc";

    // If search query is provided, handle search differently
    if (search) {
      const searchResults = await prisma.product.findMany({
        where: {
          isActive: true,
          // isPublished: true, // Commented out for development
          name: {
            contains: search,
            mode: "insensitive",
          },
        },
        include: {
          category: {
            select: {
              name: true,
              slug: true,
            },
          },
          images: {
            orderBy: { position: "asc" },
            take: 3,
          },
        },
        take: 20,
        orderBy: { name: "asc" },
      });

      // Transform prices from cents to rupees
      const transformedResults = searchResults.map((product) => ({
        ...product,
        price: Math.round(product.priceCents / 100),
        compareAtPrice: product.compareAtCents
          ? Math.round(product.compareAtCents / 100)
          : null,
      }));

      return NextResponse.json({
        products: transformedResults,
        total: transformedResults.length,
      });
    }

    // Validate category parameter for normal listing (not required for price-based browsing)
    if (!category && !maxPrice && !categoryId) {
      return NextResponse.json(
        { error: "Category, maxPrice, or categoryId parameter is required" },
        { status: 400 }
      );
    }

    // Calculate offset for pagination
    const offset = (page - 1) * limit;

    // Build where clause
    const where: Prisma.ProductWhereInput = {
      isActive: true,
      // Commenting out isPublished requirement for now to show all active products
      // isPublished: true,
    };

    // Add category filter
    if (category) {
      where.category = {
        slug: category,
      };
    } else if (categoryId) {
      where.categoryId = categoryId;
    }

    // Add price filter
    if (maxPrice !== undefined) {
      where.priceCents = { lte: maxPrice };
    } else if (priceMin !== undefined || priceMax !== undefined) {
      where.priceCents = {};
      if (priceMin !== undefined) where.priceCents.gte = priceMin * 100;
      if (priceMax !== undefined) where.priceCents.lte = priceMax * 100;
    }

    // Add color filter
    if (color) {
      where.variants = {
        some: {
          color: {
            contains: color,
          },
          isActive: true,
        },
      };
    }

    // Add filter-option attribute matching (e.g. metal type, stone type)
    // Matches selected values against any variant's color, material, or size
    if (attrValues.length > 0) {
      where.variants = {
        some: {
          isActive: true,
          OR: attrValues.flatMap((value) => [
            { color: { equals: value, mode: "insensitive" as const } },
            { material: { equals: value, mode: "insensitive" as const } },
            { size: { equals: value, mode: "insensitive" as const } },
          ]),
        },
      };
    }

    // Build order by
    const orderBy: Prisma.ProductOrderByWithRelationInput = {};
    switch (sortBy) {
      case "price":
        orderBy.priceCents = sortOrder;
        break;
      case "name":
        orderBy.name = sortOrder;
        break;
      case "createdAt":
      default:
        orderBy.createdAt = sortOrder;
        break;
    }

    // Fetch products with related data
    const [products, totalCount] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          images: {
            where: { isPrimary: true },
            orderBy: { position: "asc" },
          },
          variants: {
            where: { isActive: true },
            orderBy: { stock: "desc" },
          },
          category: true,
        },
        orderBy,
        skip: offset,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    // Transform data for frontend
    const transformedProducts = products.map((product) => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      price: product.priceCents / 100, // Convert cents to rupees
      compareAtPrice: product.compareAtCents
        ? product.compareAtCents / 100
        : null,
      stock: product.stock || 0, // Add stock field
      sku: product.sku,
      isFeatured: product.isFeatured,
      images: product.images.map((img) => ({
        url: img.url,
        alt: img.alt || product.name,
      })),
      variants: product.variants.map((variant) => ({
        id: variant.id,
        name: variant.name,
        price: variant.priceCents
          ? variant.priceCents / 100
          : product.priceCents / 100,
        color: variant.color,
        size: variant.size,
        material: variant.material,
        stock: variant.stock,
      })),
      category: {
        name: product.category.name,
        slug: product.category.slug,
      },
    }));

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return NextResponse.json({
      products: transformedProducts,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage,
        hasPrevPage,
      },
      filters: {
        applied: {
          priceMin: priceMin ? priceMin * 100 : undefined,
          priceMax: priceMax ? priceMax * 100 : undefined,
          color,
          category,
        },
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
