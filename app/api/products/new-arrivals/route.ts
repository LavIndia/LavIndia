import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Get recently added products (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        // isPublished: true, // Commented out for development
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
      include: {
        images: {
          orderBy: { position: "asc" },
        },
        category: true,
      },
      orderBy: {
        createdAt: "desc",
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
      images: product.images.map((img) => ({
        url: img.url,
        alt: img.alt || product.name,
      })),
    }));

    return NextResponse.json({ products: formattedProducts });
  } catch (error) {
    console.error("New arrivals fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch new arrivals" },
      { status: 500 }
    );
  }
}
