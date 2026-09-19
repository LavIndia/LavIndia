import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isBestSeller } from "@/lib/product-tags";
import { getBestsellerRanking } from "@/lib/bestseller-ranking";
import { availabilityByProduct } from "@/modules/inventory";

export async function GET() {
  try {
    // The ranking is a cached aggregate over the whole order history — see
    // lib/bestseller-ranking.ts. It is recomputed only when an order is
    // placed, so this rail costs no counting query on a normal page view.
    const ranking = await getBestsellerRanking();
    const rankedIds = ranking.slice(0, 24).map((entry) => entry.productId);

    if (rankedIds.length === 0) {
      return NextResponse.json({ products: [] });
    }

    // Only products that have ACTUALLY sold qualify. The rail previously
    // returned the entire catalog merely sorted by sales, so items that had
    // never sold were presented as bestsellers — and it disagreed with the
    // badge, which uses isBestSeller(count > 0).
    const unsorted = await prisma.product.findMany({
      where: {
        isActive: true,
        isPublished: true,
        id: { in: rankedIds },
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
    });

    // Restore the ranked order, which the id-filtered query does not preserve,
    // then cap the rail.
    const position = new Map(rankedIds.map((id, index) => [id, index]));
    const products = unsorted
      .sort((a, b) => (position.get(a.id) ?? 0) - (position.get(b.id) ?? 0))
      .slice(0, 12);

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
