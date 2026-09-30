/**
 * What the storefront says about offers: the offers band on the homepage,
 * and the badge on each product card ("3 for ₹999").
 *
 * Built from the same live offers checkout prices against, so a client is
 * never shown an offer the cart would not give them. Cached for a minute and
 * dropped whenever an offer, a piece set or a product changes.
 */
import { unstable_cache } from "next/cache";
import { getPromotionSnapshot, resolvedPromotions } from "@/lib/promotions-cache";
import {
  classOf,
  isLive,
  loadCatalogFacts,
  matchesFilter,
  pieceAsLine,
  rupees,
  statusOf,
  type Benefit,
  type PromotionRow,
} from "@/modules/promotions";

export interface StorefrontOffer {
  id: string;
  title: string;
  description: string | null;
  /** The shared code to type at checkout; null when it applies by itself. */
  code: string | null;
  /** The two lines of the ticket's stub, e.g. "20%" / "Off", "3 for" / "₹999". */
  stub: [string, string];
  /** Qualifiers and expiry in words; null when there are none. */
  meta: string | null;
}

function stubFor(benefit: Benefit): [string, string] {
  switch (benefit.type) {
    case "percentOff":
    case "percentOffOrder":
      return [`${benefit.bps / 100}%`, "Off"];
    case "amountOffEach":
    case "amountOffOrder":
      return [rupees(benefit.cents), "Off"];
    case "fixedPriceEach":
      return ["All at", rupees(benefit.cents)];
    case "setPrice":
      return [`${benefit.setSize} for`, rupees(benefit.priceCents)];
    case "setPriceTiers":
      return ["Buy more", "pay less"];
    case "percentTiers":
      return ["Up to", `${Math.max(...benefit.tiers.map((t) => t.bps)) / 100}% off`];
    case "orderTiers":
      return ["Up to", `${rupees(Math.max(...benefit.tiers.map((t) => t.amountOffCents ?? 0)))} off`];
    case "reward":
      return [`Buy ${benefit.buyQuantity}`, benefit.value.type === "percent" && benefit.value.bps >= 10_000 ? `Get ${benefit.getQuantity} free` : `Get ${benefit.getQuantity}`];
    case "bundle":
      return ["Set", rupees(benefit.priceCents)];
    case "freeDelivery":
      return ["Free", "Delivery"];
  }
}

function metaFor(row: PromotionRow): string | null {
  const parts: string[] = [];
  const minOrder = (row.conditions as Array<{ type: string; cents?: number }>).find((c) => c.type === "minOrderSubtotal");
  const min = row.minSubtotalCents ?? minOrder?.cents ?? null;
  if (min) parts.push(`On orders over ${rupees(min)}`);
  if (row.endsAt) {
    parts.push(`Until ${row.endsAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`);
  }
  return parts.length ? parts.join(" · ") : null;
}

async function build() {
  const now = new Date();
  const [snapshot, facts] = await Promise.all([getPromotionSnapshot(), loadCatalogFacts()]);
  const shown = snapshot.rows.filter((row) => statusOf(row, now) === "LIVE" && row.showOnStorefront && row.channels.includes("ONLINE"));
  const engine = new Map(resolvedPromotions(shown, snapshot.library).map((p) => [p.id, p]));

  const offers: StorefrontOffer[] = [];
  const badges: Record<string, string> = {};

  for (const row of shown) {
    const promotion = engine.get(row.id);
    if (!promotion || !isLive(promotion, now)) continue;
    const sharedCode = row.codes.find((c) => !c.batch)?.code ?? null;
    // A code offer with only one-per-client codes is private: never listed.
    if (row.trigger === "CODE" && !sharedCode) continue;

    offers.push({
      id: row.id,
      title: promotion.label,
      description: row.terms,
      code: row.trigger === "CODE" ? sharedCode : null,
      stub: stubFor(promotion.benefit),
      meta: metaFor(row),
    });

    // Badges go on the pieces an automatic piece offer covers.
    if (row.trigger === "AUTOMATIC" && classOf(promotion.benefit) === "PIECE") {
      const badge = row.badge || promotion.label;
      for (const piece of facts.pieces) {
        if (piece.onlineSellable && !badges[piece.productId] && matchesFilter(pieceAsLine(piece), promotion.pieces)) {
          badges[piece.productId] = badge;
        }
      }
    }
  }
  return { offers, badges };
}

export const getStorefrontOffers = unstable_cache(build, ["storefront-offers"], {
  tags: ["promotions", "products"],
  revalidate: 60,
});
