import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { availabilityByProduct } from "@/modules/inventory";

export async function GET() {
  try {
    // Get recently added products (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    let products = await prisma.product.findMany({
      where: {
        isActive: true,
        isPublished: true,
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

    // "New Arrival" is only ever a true claim about products actually
    // created within the window — the fallback below (used when nothing
    // qualifies) shouldn't borrow that label for older products.
    const withinWindow = products.length > 0;

    if (products.length === 0) {
      products = await prisma.product.findMany({
        where: { isActive: true, isPublished: true },
        include: { images: { orderBy: { position: "asc" } }, category: true },
        orderBy: { createdAt: "desc" },
        take: 12,
      });
    }

    // One batched lookup for the whole rail rather than a query per card.
    const availability = await availabilityByProduct(products.map((p) => p.id));

    // Transform to match frontend interface
    const formattedProducts = products.map((product) => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      priceCents: product.priceCents,
      compareAtCents: product.compareAtCents,
      stock: availability.get(product.id)?.available ?? 0,
      isFeatured: product.isFeatured,
      isLimitedEdition: product.isLimitedEdition,
      isNewArrival: withinWindow,
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
