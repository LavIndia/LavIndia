/**
 * Which pieces a set would hold, as the admin edits it — with the ones
 * that could not sell right now called out, so an empty-looking offer is
 * never a surprise.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiHandler } from "@/lib/api-handler";
import { requireAdmin } from "@/lib/require-admin";
import { inPieceSet, loadCatalogFacts, pieceAsLine, pieceSetInputSchema } from "@/modules/promotions";

const schema = z.object({ input: pieceSetInputSchema });

export const POST = apiHandler(async (req: NextRequest) => {
  await requireAdmin("catalog:write");
  const { input } = schema.parse(await req.json());
  const facts = await loadCatalogFacts();
  const set = { ...input, id: "draft" };

  const byProduct = new Map<string, { productId: string; name: string; imageUrl: string | null; minCents: number; maxCents: number; online: boolean }>();
  for (const piece of facts.pieces) {
    if (!inPieceSet(pieceAsLine(piece), set)) continue;
    const entry = byProduct.get(piece.productId) ?? {
      productId: piece.productId,
      name: piece.productName,
      imageUrl: piece.imageUrl,
      minCents: piece.priceCents,
      maxCents: piece.priceCents,
      online: false,
    };
    entry.minCents = Math.min(entry.minCents, piece.priceCents);
    entry.maxCents = Math.max(entry.maxCents, piece.priceCents);
    entry.online ||= piece.onlineSellable;
    byProduct.set(piece.productId, entry);
  }
  const products = [...byProduct.values()].sort((a, b) => a.name.localeCompare(b.name));
  const known = new Set(facts.products.map((p) => p.id));
  return NextResponse.json({
    count: products.length,
    notOnline: products.filter((p) => !p.online).length,
    missingProducts: [...input.includeProductIds, ...input.excludeProductIds].filter((id) => !known.has(id)).length,
    products: products.slice(0, 60),
  });
});
