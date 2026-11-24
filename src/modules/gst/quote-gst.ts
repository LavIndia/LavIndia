/**
 * Bringing the GST engine to a priced cart, without disturbing it.
 *
 *   OFF      the quote is returned untouched. Nothing is read beyond the cached
 *            mode, nothing is attached, nothing changes.
 *   SHADOW   the engine runs beside the existing one and its result is attached
 *            to the quote for the audit trail. The quote the customer pays on
 *            is the same object's numbers, unchanged.
 *   ENFORCE  the engine's tax replaces the existing tax. Every line must have a
 *            verified classification and an approved rate, or the cart is
 *            refused: there is no fallback to a default rate.
 *
 * In SHADOW nothing this does may stop a sale — any failure is captured in the
 * attachment and the quote goes through as it would have anyway.
 */
import { DomainError } from "../_shared/errors";
import { quoteCart, type Quote, type QuoteInput } from "../orders/quote";
import type { OrderLineSnapshot } from "../orders/contracts";
import type { SellableVariant } from "../catalog";
import { calculateGst } from "./engine/calculate";
import type { ChargeInput, ChargeTreatment, GoodsLine, GstResult, RateVersion } from "./engine/types";
import { placeOfSupply } from "./places";
import { resolveCharge, resolveGoods, type Classified, type Unclassified } from "./rates/resolver";
import { engineMode, gstState, type EngineMode } from "./state";
import type { GstPayload, LineClassification } from "./quote-types";

export interface GstContext {
  channel: "ONLINE" | "STORE";
  pricesIncludeTax: boolean;
  codFeeCents?: number;
  deliveryStateName?: string | null;
  deliveryStateCode?: string | null;
  /**
   * The checkout prices a cart before an address exists. Tax in total does not
   * depend on the place of supply (CGST + SGST equals IGST), so the amount is
   * right even though the split is not yet known.
   */
  deferPlaceOfSupply?: boolean;
  now?: Date;
}

const blank = (legacyTaxCents: number, charges: GstPayload["charges"], extra: Partial<GstPayload>): GstPayload => ({
  status: "ERROR",
  supplierStateCode: null,
  placeOfSupplyCode: null,
  supplyType: null,
  placeOfSupplyBasis: null,
  pricesIncludeTax: false,
  classifications: [],
  missing: [],
  legacyTaxCents,
  charges,
  deliveryState: null,
  mixedBasketPolicy: "PROPORTIONAL",
  ...extra,
});

function describeMissing(missing: readonly Unclassified[], quote: Quote): string {
  const names = missing.slice(0, 3).map((m) => {
    const line = m.key.match(/^\d+$/) ? quote.lines[Number(m.key)] : null;
    return `${line?.name ?? (m.chargeKind === "SHIPPING" ? "Delivery" : m.chargeKind === "COD_FEE" ? "Cash-on-delivery fee" : "An item")}: ${m.detail}`;
  });
  return `GST cannot be worked out: ${names.join("; ")}${missing.length > 3 ? ` (and ${missing.length - 3} more)` : ""}`;
}

async function compute(quote: Quote, ctx: GstContext, mode: Exclude<EngineMode, "OFF">): Promise<{ quote: Quote; payload: GstPayload; codTaxCents: number }> {
  const { profile, config } = await gstState();
  const shippingCents = quote.totals.shippingCents;
  const codFeeCents = ctx.codFeeCents ?? 0;
  const shippingTreatment = config?.shippingTreatment ?? "UNSET";
  const codTreatment = config?.codTreatment ?? "UNSET";
  const policy = config?.mixedBasketPolicy ?? "PROPORTIONAL";
  const charges = { shippingCents, codFeeCents, shippingTreatment, codTreatment };
  const legacy = quote.totals.taxCents;

  if (mode === "ENFORCE" && (shippingTreatment === "UNSET" || codTreatment === "UNSET")) {
    throw new DomainError("GST_NOT_READY", "GST cannot be enforced until delivery and cash-on-delivery treatment are decided");
  }

  const supplier = profile?.stateCode ?? null;
  const place = placeOfSupply({ channel: ctx.channel, supplierStateCode: supplier, deliveryStateName: ctx.deliveryStateName, deliveryStateCode: ctx.deliveryStateCode });
  if (!place && !ctx.deferPlaceOfSupply) {
    const message = !supplier ? "The shop's own state is not set in the GST business profile" : "The delivery state could not be read from the address";
    if (mode === "ENFORCE") throw new DomainError("GST_PLACE_OF_SUPPLY_UNKNOWN", message);
    return { quote, codTaxCents: 0, payload: blank(legacy, charges, { status: "ERROR", message, supplierStateCode: supplier, pricesIncludeTax: ctx.pricesIncludeTax, deliveryState: ctx.deliveryStateName ?? null }) };
  }
  const supplyType = place?.supplyType ?? "INTRA_STATE";

  const now = ctx.now ?? new Date();
  const goodsQueries = quote.lines.map((line, index) => ({ key: String(index), productId: line.productId, variantId: line.variantId as string, unitValueCents: line.priceCents }));
  const { classified, missing } = await resolveGoods(goodsQueries, now);

  const treatmentOf = (t: string): ChargeTreatment => (t === "UNSET" ? "NONE" : (t as ChargeTreatment));
  const chargeInputs: ChargeInput[] = [];
  const separate: Array<["SHIPPING" | "COD_FEE", number, string]> = [];
  if (shippingCents > 0) separate.push(["SHIPPING", shippingCents, shippingTreatment]);
  if (codFeeCents > 0) separate.push(["COD_FEE", codFeeCents, codTreatment]);
  for (const [kind, amount, treatment] of separate) {
    if (treatment === "SEPARATE") {
      const found = await resolveCharge(kind, amount, now);
      if (found.missing) missing.push(found.missing);
      else chargeInputs.push({ kind, amountCents: amount, treatment: "SEPARATE", rate: (found.classified as Classified).rate });
    } else {
      chargeInputs.push({ kind, amountCents: amount, treatment: treatmentOf(treatment) });
    }
  }

  const base: Partial<GstPayload> = {
    supplierStateCode: supplier,
    placeOfSupplyCode: place?.stateCode ?? null,
    supplyType: place?.supplyType ?? null,
    placeOfSupplyBasis: place?.basis ?? null,
    pricesIncludeTax: ctx.pricesIncludeTax,
    deliveryState: ctx.deliveryStateName ?? null,
    mixedBasketPolicy: policy,
  };

  if (missing.length > 0) {
    const message = describeMissing(missing, quote);
    if (mode === "ENFORCE") {
      throw new DomainError("GST_CLASSIFICATION_MISSING", message, { missing: missing.map((m) => ({ key: m.key, productId: m.productId, reason: m.reason })) });
    }
    return { quote, codTaxCents: 0, payload: blank(legacy, charges, { ...base, status: "MISSING_MAPPING", message, missing }) };
  }

  const goods: GoodsLine[] = quote.lines.map((line, index) => ({
    lineId: String(index),
    amountCents: line.priceCents * line.quantity,
    rate: (classified.get(String(index)) as Classified).rate,
    quantity: line.quantity,
  }));
  const result = calculateGst({ supplyType, pricesIncludeTax: ctx.pricesIncludeTax, goods, charges: chargeInputs, mixedBasketPolicy: policy });

  const classifications: LineClassification[] = quote.lines.map((line, index) => ({
    index,
    productId: line.productId,
    name: line.name,
    quantity: line.quantity,
    amountCents: line.priceCents * line.quantity,
    rate: (classified.get(String(index)) as Classified).rate,
    mappingId: (classified.get(String(index)) as Classified).mappingId,
  }));

  const codTaxCents = result.lines.filter((l) => l.kind === "COD_FEE").reduce((s, l) => s + l.taxCents, 0);
  const payload = blank(legacy, charges, { ...base, status: "CALCULATED", result, classifications, message: undefined });

  if (mode === "SHADOW") return { quote, codTaxCents: 0, payload };

  return { quote: enforce(quote, result, classifications, ctx.pricesIncludeTax), codTaxCents, payload };
}

/** The quote with the engine's tax in place of the existing tax. */
function enforce(quote: Quote, result: GstResult, classifications: LineClassification[], includeTax: boolean): Quote {
  const goods = new Map(result.lines.filter((l) => l.kind === "GOODS").map((l) => [Number(l.lineId), l]));
  const lines: OrderLineSnapshot[] = quote.lines.map((line, index) => {
    const part = goods.get(index)!;
    const classification = classifications[index];
    return {
      ...line,
      taxCents: part.taxCents,
      taxRateBps: classification.rate.rateBps,
      hsnCode: classification.rate.code,
    };
  });
  const tax = result.lines.filter((l) => l.kind !== "COD_FEE").reduce((s, l) => s + l.taxCents, 0);
  const { totals } = quote;
  return {
    ...quote,
    lines,
    totals: {
      ...totals,
      taxCents: tax,
      grandTotalCents: totals.subtotalCents - totals.discountCents + totals.shippingCents + (includeTax ? 0 : tax),
    },
  };
}

/**
 * Applies the engine to a quote according to its mode. Never throws in SHADOW;
 * in ENFORCE it throws a DomainError when GST cannot be worked out properly.
 */
export async function applyGstToQuote(quote: Quote, ctx: GstContext): Promise<Quote> {
  const mode = await engineMode();
  if (mode === "OFF") return quote;
  try {
    const out = await compute(quote, ctx, mode);
    return { ...out.quote, gst: { mode, codTaxCents: out.codTaxCents, payload: out.payload } };
  } catch (error) {
    if (mode === "ENFORCE") throw error;
    console.error("GST shadow calculation failed:", error);
    const legacy = quote.totals.taxCents;
    const payload = blank(legacy, { shippingCents: quote.totals.shippingCents, codFeeCents: ctx.codFeeCents ?? 0, shippingTreatment: "UNSET", codTreatment: "UNSET" }, { message: error instanceof Error ? error.message : "Unknown failure" });
    return { ...quote, gst: { mode, codTaxCents: 0, payload } };
  }
}

/** quoteCart, followed by the GST engine for whichever mode is on. Identical to quoteCart when OFF. */
export async function quoteCartWithGst(
  input: QuoteInput,
  variants: Map<string, SellableVariant>,
  ctx: Omit<GstContext, "pricesIncludeTax">,
): Promise<Quote> {
  const quote = quoteCart(input, variants);
  return applyGstToQuote(quote, { ...ctx, pricesIncludeTax: input.pricesIncludeTax });
}

export type { RateVersion };
