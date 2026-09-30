/**
 * What a cart costs — the one pricing path for both channels.
 *
 *   catalog prices → manual overrides → offers (promotion engine)
 *   → lines split where units ended up at different prices
 *   → GST per line → totals summed from the lines
 *
 * Pure: the caller supplies the variants and the live offers, so the
 * checkout, the counter, the cart drawer and the admin's test panel all get
 * exactly the same numbers for the same cart.
 *
 * A line is split when its units end up at different prices — one piece
 * inside a set, one outside it — so that every stored line is an exact
 * "price × quantity" and an invoice never shows a rounded unit price.
 */
import { evaluatePromotions } from "../promotions/engine/evaluate";
import type {
  Channel,
  EngineLine,
  EnginePromotion,
  Evaluation,
  PaymentInstrument,
  UnitAllocation,
} from "../promotions/contracts";
import { allocateProportionally } from "../promotions/engine/allocate";
import { DomainError } from "../_shared/errors";
import { VariantId } from "../_shared/ids";
import type { SellableVariant } from "../catalog";
import type { LineAllocation, OrderLineInput, OrderLineSnapshot, OrderTotals } from "./contracts";

export interface QuoteInput {
  channel: Channel;
  lines: readonly OrderLineInput[];
  promotions: readonly EnginePromotion[];
  codes?: readonly string[];
  customer?: { id: string | null; previousOrderCount: number };
  paymentMethod?: PaymentInstrument | null;
  shippingCents?: number;
  /** A manual discount off the whole order, as at the counter. */
  manualOrderDiscountCents?: number;
  /** Whether catalog prices on this channel already include GST. */
  pricesIncludeTax: boolean;
  taxRateBps: number;
  now?: Date;
}

export interface Quote {
  lines: OrderLineSnapshot[];
  totals: OrderTotals & { deliveryDiscountCents: number };
  evaluation: Evaluation;
  applied: Array<{ promotionId: string; label: string; code: string | null; savingCents: number }>;
}

interface UnitPrice {
  lineIndex: number;
  listCents: number;
  chargedBeforeOffers: number;
  promotionCents: number;
  manualCents: number;
  allocations: UnitAllocation[];
}

function engineLines(lines: readonly OrderLineInput[], variants: Map<string, SellableVariant>) {
  return lines.map((line, index): EngineLine => {
    const variant = variants.get(line.variantId);
    if (!variant) {
      throw new DomainError("VARIANT_NOT_FOUND", "That item is no longer available", {
        variantId: line.variantId,
      });
    }
    if (!Number.isInteger(line.quantity) || line.quantity <= 0) {
      throw new DomainError("INVALID_QUANTITY", "Quantity must be a whole number above zero");
    }
    const override = line.overridePriceCents;
    if (override !== undefined && (!Number.isInteger(override) || override < 0)) {
      throw new DomainError("VALIDATION_FAILED", "An overridden price must be a whole number");
    }
    return {
      lineId: String(index),
      variantId: variant.variantId,
      productId: variant.productId,
      categoryId: variant.categoryId,
      collectionIds: variant.collectionIds,
      material: variant.productMaterial,
      color: variant.attributes.color,
      size: variant.attributes.size,
      unitPriceCents: override ?? variant.priceCents,
      quantity: line.quantity,
      // A price set by hand at the counter is final; offers leave it alone.
      locked: override !== undefined,
    };
  });
}

function taxFor(grossCents: number, rateBps: number, included: boolean): number {
  if (!included) return Math.round((grossCents * rateBps) / 10_000);
  return grossCents - Math.round((grossCents * 10_000) / (10_000 + rateBps));
}

/** Adds allocations of the same offer application together. */
function sumAllocations(units: readonly UnitPrice[]): LineAllocation[] {
  const byKey = new Map<string, LineAllocation>();
  for (const unit of units) {
    for (const a of unit.allocations) {
      const key = `${a.promotionId}|${a.applicationKey}`;
      const existing = byKey.get(key);
      if (existing) existing.cents += a.cents;
      else byKey.set(key, { ...a });
    }
  }
  return [...byKey.values()];
}

export function quoteCart(input: QuoteInput, variants: Map<string, SellableVariant>): Quote {
  const lines = engineLines(input.lines, variants);
  const evaluation = evaluatePromotions(lines, input.promotions, {
    channel: input.channel,
    now: input.now ?? new Date(),
    codes: [...(input.codes ?? [])],
    customer: input.customer ?? { id: null, previousOrderCount: 0 },
    paymentMethod: input.paymentMethod ?? null,
    shippingCents: input.shippingCents ?? 0,
    // When shelf prices already include GST, an offer price is compared on
    // the same footing, so no conversion is needed.
    taxRateBps: input.pricesIncludeTax ? 0 : input.taxRateBps,
  });

  const units: UnitPrice[] = evaluation.units.map((unit) => {
    const lineIndex = Number(unit.lineId);
    const variant = variants.get(input.lines[lineIndex].variantId)!;
    // A price raised by hand is the list price for that sale; one lowered by
    // hand is a manual discount against the catalog price.
    const listCents = Math.max(variant.priceCents, unit.listCents);
    return {
      lineIndex,
      listCents,
      chargedBeforeOffers: unit.listCents,
      promotionCents: unit.discountCents,
      manualCents: listCents - unit.listCents,
      allocations: unit.allocations,
    };
  });

  // A manual discount off the whole order is spread across the units by what
  // each is being sold for, so it lands on lines like any other discount.
  const manualOrder = Math.max(0, input.manualOrderDiscountCents ?? 0);
  if (manualOrder > 0) {
    const nets = units.map((u) => u.chargedBeforeOffers - u.promotionCents);
    const total = nets.reduce((sum, n) => sum + n, 0);
    const shares = allocateProportionally(
      Math.min(manualOrder, total),
      nets.map((net, i) => ({ weight: net, priority: units[i].listCents })),
    );
    shares.forEach((share, i) => (units[i].manualCents += share));
  }

  // Units of one line that ended up at the same price, with the same offers,
  // become one stored line.
  const groups = new Map<string, UnitPrice[]>();
  for (const unit of units) {
    const signature = [
      unit.lineIndex,
      unit.promotionCents,
      unit.manualCents,
      unit.allocations.map((a) => `${a.promotionId}:${a.cents}`).join(","),
    ].join("|");
    const group = groups.get(signature) ?? [];
    group.push(unit);
    groups.set(signature, group);
  }

  const rate = input.taxRateBps;
  const snapshots: OrderLineSnapshot[] = [...groups.values()]
    .sort((a, b) => a[0].lineIndex - b[0].lineIndex)
    .map((group) => {
      const first = group[0];
      const line = input.lines[first.lineIndex];
      const variant = variants.get(line.variantId)!;
      const quantity = group.length;
      const priceCents = first.listCents - first.manualCents - first.promotionCents;
      const gross = priceCents * quantity;
      return {
        variantId: VariantId(variant.variantId),
        productId: variant.productId,
        name: variant.productName,
        variantName: variant.isDefault ? null : variant.variantName,
        sku: variant.sku,
        barcode: variant.barcode,
        quantity,
        catalogPriceCents: first.listCents,
        priceCents,
        unitCostCents: variant.costCents,
        discountCents: (first.manualCents + first.promotionCents) * quantity,
        promotionDiscountCents: first.promotionCents * quantity,
        allocations: sumAllocations(group),
        taxCents: taxFor(gross, rate, input.pricesIncludeTax),
        taxRateBps: rate,
        lineTotalCents: gross,
      };
    });

  const sum = (pick: (line: OrderLineSnapshot) => number) =>
    snapshots.reduce((total, line) => total + pick(line), 0);
  const subtotalCents = sum((l) => l.catalogPriceCents * l.quantity);
  const discountCents = sum((l) => l.discountCents);
  const taxCents = sum((l) => l.taxCents);
  const shippingCents = Math.max(0, (input.shippingCents ?? 0) - evaluation.deliveryDiscountCents);

  return {
    lines: snapshots,
    totals: {
      subtotalCents,
      discountCents,
      promotionDiscountCents: sum((l) => l.promotionDiscountCents),
      taxCents,
      taxIncluded: input.pricesIncludeTax,
      shippingCents,
      deliveryDiscountCents: evaluation.deliveryDiscountCents,
      grandTotalCents:
        subtotalCents - discountCents + shippingCents + (input.pricesIncludeTax ? 0 : taxCents),
    },
    evaluation,
    applied: evaluation.applied.map((a) => ({
      promotionId: a.promotionId,
      label: a.label,
      code: a.code,
      savingCents: a.savingCents,
    })),
  };
}
