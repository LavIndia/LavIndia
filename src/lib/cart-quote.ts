/**
 * Prices a cart for display or for sale — the counter, the storefront cart,
 * the checkout and the order route all come through here, so what a client
 * is shown is what they are charged.
 */
import { catalogService, type SellableVariant } from "@/modules/catalog";
import { GST_RATE_BPS, quoteCart, type Quote } from "@/modules/orders";
import { VariantId } from "@/modules/_shared/ids";
import { rupees, type Channel, type Nudge, type PaymentInstrument } from "@/modules/promotions";
import { getPromotionSnapshot, pricingContext, type PricingContext } from "@/lib/promotions-cache";

export interface CartLineInput {
  variantId: string;
  quantity: number;
  overridePriceCents?: number;
  overrideReason?: string;
}

export interface CartMessage {
  promotionId: string;
  text: string;
}

export interface PricedCart {
  quote: Quote;
  pricing: PricingContext;
  variants: Map<string, SellableVariant>;
  /** "Any 3 for ₹999 · you save ₹498" */
  appliedMessages: CartMessage[];
  /** "Add 1 more from Bangles to get 3 for ₹999" */
  nudgeMessages: CartMessage[];
  /** Codes that did not unlock anything, with why when the engine knows. */
  codeProblems: Array<{ code: string; text: string }>;
}

function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => values[key] ?? match);
}

function nudgeText(nudge: Nudge, custom: string | null): string {
  const remaining = nudge.remainingQuantity
    ? `${nudge.remainingQuantity} more piece${nudge.remainingQuantity === 1 ? "" : "s"}`
    : rupees(nudge.remainingCents ?? 0) + " more";
  if (custom) return fill(custom, { remaining, offer: nudge.label });
  return `Add ${remaining} to get ${nudge.label}`;
}

export async function priceCart(args: {
  channel: Channel;
  lines: readonly CartLineInput[];
  codes?: string[];
  customerId?: string | null;
  paymentMethod?: PaymentInstrument | null;
  shippingCents?: number;
  manualOrderDiscountCents?: number;
}): Promise<PricedCart> {
  const [pricing, variantList, snapshot] = await Promise.all([
    pricingContext({
      channel: args.channel,
      customerId: args.customerId,
      codes: args.codes,
      paymentMethod: args.paymentMethod,
    }),
    catalogService.findVariantsByIds(args.lines.map((line) => VariantId(line.variantId))),
    getPromotionSnapshot(),
  ]);
  const variants = new Map(variantList.map((v) => [v.variantId as string, v]));
  const rows = new Map(snapshot.rows.map((row) => [row.id, row]));

  const quote = quoteCart(
    {
      channel: args.channel,
      lines: args.lines.map((line) => ({ ...line, variantId: VariantId(line.variantId) })),
      promotions: pricing.promotions,
      codes: pricing.codes,
      customer: pricing.customer,
      paymentMethod: pricing.paymentMethod,
      shippingCents: args.shippingCents,
      manualOrderDiscountCents: args.manualOrderDiscountCents,
      pricesIncludeTax: pricing.pricesIncludeTax,
      taxRateBps: GST_RATE_BPS,
    },
    variants,
  );

  const appliedMessages = quote.applied.map((a) => {
    const custom = rows.get(a.promotionId)?.appliedText;
    const saving = rupees(a.savingCents);
    return {
      promotionId: a.promotionId,
      text: custom ? fill(custom, { saving, offer: a.label }) : `${a.label} · you save ${saving}`,
    };
  });

  const appliedIds = new Set(quote.applied.map((a) => a.promotionId));
  const nudgeMessages = quote.evaluation.nudges
    .filter((n) => !appliedIds.has(n.promotionId) || n.remainingQuantity)
    .map((n) => ({ promotionId: n.promotionId, text: nudgeText(n, rows.get(n.promotionId)?.nudgeText ?? null) }));

  const codeProblems = quote.evaluation.unusedCodes.map((code) => {
    const offer = snapshot.rows.find((row) => row.codes.some((c) => c.code === code));
    const rejected = offer
      ? quote.evaluation.rejected.find((r) => r.promotionId === offer.id)
      : undefined;
    const codeRow = offer?.codes.find((c) => c.code === code);
    const usedUp = codeRow && codeRow.usageLimit !== null && codeRow.usedCount >= codeRow.usageLimit;
    const text = !offer
      ? "This code isn't valid"
      : usedUp
        ? "This code has already been used"
        : rejected?.reason === "NOT_COMBINABLE" || rejected?.reason === "SAVES_LESS"
        ? "Your cart already has a better offer, so this code wasn't needed"
        : rejected?.reason === "EXCLUSIVE_ELSEWHERE"
          ? "This code can't be used with the offer already applied"
          : "Your cart doesn't qualify for this code yet";
    return { code, text };
  });

  return { quote, pricing, variants, appliedMessages, nudgeMessages, codeProblems };
}

/**
 * What a screen needs from a priced cart — the lines as they will be sold,
 * the totals, and the words for offers, nudges and code problems. The same
 * view serves the storefront cart, the checkout and the counter.
 */
export function quoteView(priced: PricedCart) {
  const { quote } = priced;
  return {
    lines: quote.lines.map((line) => ({
      variantId: line.variantId as string,
      productId: line.productId,
      name: line.name,
      variantName: line.variantName,
      quantity: line.quantity,
      catalogPriceCents: line.catalogPriceCents,
      priceCents: line.priceCents,
      discountCents: line.discountCents,
      promotionDiscountCents: line.promotionDiscountCents,
      offers: [...new Set(line.allocations.map((a) => a.label))],
      taxCents: line.taxCents,
      lineTotalCents: line.lineTotalCents,
    })),
    totals: quote.totals,
    applied: quote.applied.map((a) => ({
      ...a,
      text: priced.appliedMessages.find((m) => m.promotionId === a.promotionId)?.text ?? a.label,
    })),
    nudges: priced.nudgeMessages,
    codeProblems: priced.codeProblems,
  };
}

export type QuoteView = ReturnType<typeof quoteView>;
