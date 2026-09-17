import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { ProductPageClient } from "./ProductPageClient";

// Minimal, cheap lookup — only what a social/link preview needs. The
// interactive page below still does its own client-side fetch for full
// product data (variants, stock, reviews); this one exists purely because
// Open Graph tags must be rendered server-side for crawlers that never run
// the page's JS. Cached like every other product read in this app (see
// src/lib/category-data.ts) so a link being shared/previewed repeatedly
// doesn't hit the database each time — busted by the same "products" tag
// admin product edits already invalidate.
async function fetchProductMeta(idOrSlug: string) {
  return prisma.product.findFirst({
    where: {
      OR: [{ slug: idOrSlug }, { id: idOrSlug }],
      isActive: true,
      isPublished: true,
    },
    select: {
      name: true,
      slug: true,
      description: true,
      images: {
        orderBy: [{ isPrimary: "desc" }, { position: "asc" }],
        take: 1,
        select: { url: true, alt: true },
      },
    },
  });
}

function getProductMeta(idOrSlug: string) {
  const cached = unstable_cache(
    () => fetchProductMeta(idOrSlug),
    ["product-meta", idOrSlug],
    { tags: ["products", `product-${idOrSlug}`], revalidate: 60 },
  );
  return cached();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const product = await getProductMeta(id);

  if (!product) {
    return { title: "Product not found | LavIndia" };
  }

  const description =
    product.description || `Shop ${product.name} at LavIndia.`;
  const image = product.images[0];

  return {
    title: `${product.name} | LavIndia`,
    description,
    openGraph: {
      title: product.name,
      description,
      siteName: "LavIndia",
      type: "website",
      images: image ? [{ url: image.url, alt: image.alt || product.name }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: product.name,
      description,
      images: image ? [image.url] : undefined,
    },
  };
}

export default function ProductPage() {
  return <ProductPageClient />;
}
