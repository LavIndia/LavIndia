/**
 * The live offers and pricing settings, cached for every cart in the shop.
 *
 * Pricing a cart must not cost a database round trip per offer, so the list
 * of active promotions is read once and shared for a minute, and dropped the
 * moment an admin saves an offer or a pricing setting (tag "promotions").
 *
 * Lives in the app layer, like catalog-cache, because the promotions module
 * must stay free of Next.js to be lifted out on its own.
 */
import { revalidateTag, unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  buildSetLibrary,
  customerFacts,
  findActivePromotionRows,
  loadSetLibrarySource,
  resolvePromotion,
  type SetLibrary,
  toEnginePromotions,
  withinCustomerLimits,
  type Channel,
  type EnginePromotion,
  type PaymentInstrument,
  type PromotionRow,
} from "@/modules/promotions";

export const PROMOTIONS_TAG = "promotions";

const DATE_FIELDS = ["startsAt", "endsAt", "activatedAt", "archivedAt", "createdAt", "updatedAt"] as const;

const loadSnapshot = unstable_cache(
  async () => {
    const [rows, settings, setSource] = await Promise.all([
      findActivePromotionRows(),
      prisma.siteSettings.findFirst({
        select: { onlinePricesIncludeGst: true, storePricesIncludeGst: true },
      }),
      loadSetLibrarySource(),
    ]);
    return {
      rows,
      setSource,
      onlinePricesIncludeGst: settings?.onlinePricesIncludeGst ?? true,
      storePricesIncludeGst: settings?.storePricesIncludeGst ?? false,
    };
  },
  ["active-promotions"],
  { tags: [PROMOTIONS_TAG], revalidate: 60 },
);

/** The cache hands dates back as strings; the engine needs real dates. */
function rehydrate(row: PromotionRow): PromotionRow {
  const copy = { ...row } as Record<string, unknown>;
  for (const field of DATE_FIELDS) {
    const value = copy[field];
    if (typeof value === "string") copy[field] = new Date(value);
  }
  return copy as unknown as PromotionRow;
}

export async function getPromotionSnapshot() {
  const snapshot = await loadSnapshot();
  const setSource = {
    ...snapshot.setSource,
    stored: snapshot.setSource.stored.map((s) => ({
      ...s,
      archivedAt: s.archivedAt ? new Date(s.archivedAt) : null,
      createdAt: new Date(s.createdAt),
      updatedAt: new Date(s.updatedAt),
    })),
  };
  return { ...snapshot, rows: snapshot.rows.map(rehydrate), library: buildSetLibrary(setSource) };
}

/** Live offers with their Piece Sets filled in, ready for the engine. */
export function resolvedPromotions(rows: PromotionRow[], library: SetLibrary): EnginePromotion[] {
  return toEnginePromotions(rows).map((p) => resolvePromotion(p, library));
}

export interface PricingContext {
  promotions: EnginePromotion[];
  customer: { id: string | null; previousOrderCount: number };
  pricesIncludeTax: boolean;
  codes: string[];
  paymentMethod: PaymentInstrument | null;
}

/** Everything a cart is priced against, for one client on one channel. */
export async function pricingContext(args: {
  channel: Channel;
  customerId?: string | null;
  codes?: string[];
  paymentMethod?: PaymentInstrument | null;
}): Promise<PricingContext> {
  const snapshot = await getPromotionSnapshot();
  const customerId = args.customerId ?? null;
  const facts = await customerFacts(customerId, snapshot.rows);
  const rows = withinCustomerLimits(snapshot.rows, facts);

  return {
    promotions: resolvedPromotions(rows, snapshot.library),
    customer: { id: customerId, previousOrderCount: facts.previousOrderCount },
    pricesIncludeTax:
      args.channel === "ONLINE" ? snapshot.onlinePricesIncludeGst : snapshot.storePricesIncludeGst,
    codes: (args.codes ?? []).map((code) => code.trim().toUpperCase()).filter(Boolean),
    paymentMethod: args.paymentMethod ?? null,
  };
}

/** Call after any change to an offer or to a pricing setting. */
export function revalidatePromotions() {
  revalidateTag(PROMOTIONS_TAG);
  // Badges and the Offers section are drawn into cached storefront views.
  revalidateTag("products");
  revalidateTag("homepage");
}
