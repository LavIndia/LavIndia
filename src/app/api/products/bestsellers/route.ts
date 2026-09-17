import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isBestSeller } from "@/lib/product-tags";

export async function GET() {
  try {
    // Get products that appear most in orders
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        isPublished: true,
      },
      include: {
        images: {
          orderBy: { position: "asc" },
        },
        category: true,
        _count: {
          select: { orderItems: true },
        },
      },
      orderBy: {
        orderItems: {
          _count: "desc",
        },
      },
    });

    // Transform to match frontend interface
    const formattedProducts = products.map((product) => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      priceCents: product.priceCents,
      compareAtCents: product.compareAtCents,
      stock: product.stock,
      isFeatured: product.isFeatured,
      isLimitedEdition: product.isLimitedEdition,
      isBestSeller: isBestSeller(product._count.orderItems),
      images: product.images.map((img) => ({
        url: img.url,
        alt: img.alt || product.name,
      })),
    }));

    return NextResponse.json({ products: formattedProducts });
  } catch (error) {
    console.error("Bestsellers fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch bestsellers" },
      { status: 500 }
    );
  }
}
