import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { getRecommendations } from "@/modules/catalog";

/**
 * Recommendation rails for one product.
 *
 * Public and read-only. Cached under the same "products" tag every other
 * catalog read uses, so an admin publishing, unpublishing or repricing a
 * product refreshes these rows too and a sold-out or withdrawn piece stops
 * being suggested. The short revalidate window is the safety net for the
 * one input no admin action invalidates — a new order changing what is
 * bought together.
 */
function cachedRecommendations(productId: string) {
  return unstable_cache(
    () => getRecommendations({ productId }),
    ["product-recommendations", productId],
    { tags: ["products", `product-${productId}`], revalidate: 300 },
  )();
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  // Named `slug` to match the sibling routes at this level; the service
  // resolves either a slug or an id.
  const { slug } = await params;

  try {
    const rails = await cachedRecommendations(slug);
    return NextResponse.json({ rails });
  } catch (error) {
    console.error("Failed to build recommendations", error);
    // A broken suggestion strip must never take the product page with it,
    // so this answers with no rails rather than an error the page has to
    // handle.
    return NextResponse.json({ rails: [] });
  }
}
