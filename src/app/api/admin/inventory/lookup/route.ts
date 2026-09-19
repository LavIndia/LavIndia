/**
 * Variant lookup for every inventory and POS screen.
 *
 * One endpoint serves scanning and searching alike, because a camera scan, a
 * hardware scanner and a typed code all produce the same thing: a string.
 * Resolving them through one pipeline is what lets a Bluetooth scanner be
 * added later without touching any screen.
 *
 * GET ?code=LAV0000000111   exact barcode/SKU match, returns one variant
 * GET ?q=necklace           free-text search, returns several
 */
import { NextRequest, NextResponse } from "next/server";
import { apiHandler } from "@/lib/api-handler";
import { requireAdmin } from "@/lib/require-admin";
import { catalogService } from "@/modules/catalog";
import { inventoryService } from "@/modules/inventory";
import { LocationId, VariantId } from "@/modules/_shared/ids";
import type { SellableVariant } from "@/modules/catalog";

const MAX_RESULTS = 20;

/**
 * Joins each variant to its stock in ONE batched call rather than asking per
 * result. The shape returned is what both Receive Stock and the POS need:
 * enough to identify the item and to know whether it can be sold.
 */
async function withStock(variants: SellableVariant[], locationId?: string) {
  if (variants.length === 0) return [];

  const levels = await inventoryService.getLevels(
    variants.map((v) => VariantId(v.variantId)),
    locationId ? { locationId: LocationId(locationId) } : undefined,
  );

  return variants.map((variant) => {
    const level = levels.get(variant.variantId);
    return {
      variantId: variant.variantId,
      productId: variant.productId,
      productName: variant.productName,
      variantName: variant.variantName,
      isDefault: variant.isDefault,
      sku: variant.sku,
      barcode: variant.barcode,
      priceCents: variant.priceCents,
      imageUrl: variant.imageUrl,
      isActive: variant.isActive,
      quantity: level?.quantity ?? 0,
      reservedQuantity: level?.reservedQuantity ?? 0,
      available: level?.available ?? 0,
    };
  });
}

export const GET = apiHandler(async (req: NextRequest) => {
  await requireAdmin("inventory:read");

  const { searchParams } = req.nextUrl;
  const code = searchParams.get("code")?.trim();
  const query = searchParams.get("q")?.trim();
  const locationId = searchParams.get("locationId")?.trim() || undefined;

  if (code) {
    const variant = await catalogService.findVariantByCode(code);

    // An unrecognised barcode NEVER creates anything. The screen shows
    // "Barcode not found" and offers a manual search instead.
    if (!variant) {
      return NextResponse.json(
        { found: false, code, error: "Barcode not found", results: [] },
        { status: 404 },
      );
    }

    const [result] = await withStock([variant], locationId);
    return NextResponse.json({ found: true, code, results: [result] });
  }

  if (!query) {
    return NextResponse.json({ found: false, results: [] });
  }

  const variants = await catalogService.searchVariants({
    query,
    limit: MAX_RESULTS,
    sellableOnly: false,
  });

  const results = await withStock(variants, locationId);
  return NextResponse.json({ found: results.length > 0, results });
});
