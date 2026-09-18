import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    if (!slug) {
      return NextResponse.json(
        { error: "Product identifier is required" },
        { status: 400 }
      );
    }

    // Try to fetch product by slug first, then by ID
    const product = await prisma.product.findFirst({
      where: {
        OR: [{ slug: slug }, { id: slug }],
        isActive: true,
        isPublished: true,
      },
      include: {
        images: {
          orderBy: { position: "asc" },
        },
        variants: {
          where: { isActive: true },
          orderBy: { stock: "desc" },
        },
        category: true,
      },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Transform data for frontend
    const transformedProduct = {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      price: Math.round(product.priceCents / 100), // Convert cents to rupees
      compareAtPrice: product.compareAtCents
        ? Math.round(product.compareAtCents / 100)
        : null,
      stock: product.stock,
      sku: product.sku,
      isFeatured: product.isFeatured,
      images: product.images.map((image) => ({
        url: image.url,
        alt: image.alt || product.name,
      })),
      variants: product.variants.map((variant) => ({
        id: variant.id,
        name: variant.name,
        price: variant.priceCents
          ? Math.round(variant.priceCents / 100)
          : Math.round(product.priceCents / 100),
        color: variant.color,
        size: variant.size,
        material: variant.material,
        stock: variant.stock,
      })),
      category: {
        name: product.category.name,
        slug: product.category.slug,
      },
    };

    return NextResponse.json(transformedProduct);
  } catch (error) {
    console.error("Error fetching product:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
