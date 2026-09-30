/**
 * The offers the storefront shows — the offers band and the badge per
 * piece. Public and cached; it says nothing checkout would not honour.
 */
import { NextResponse } from "next/server";
import { getStorefrontOffers } from "@/lib/storefront-offers";

export async function GET() {
  const data = await getStorefrontOffers();
  return NextResponse.json(data, { headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=60" } });
}
