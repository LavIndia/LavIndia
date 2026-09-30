/**
 * Writing a priced cart's lines onto an order — shared by the counter and
 * the online checkout, so both store exactly the same shape.
 *
 * Each line freezes what it was sold as, so an invoice never depends on the
 * catalog's current state; the offers behind each line's discount are
 * recorded beside it, and each offer's use is counted in the same
 * transaction as the order.
 */
import { randomUUID } from "crypto";
import type { Tx } from "../_shared/db";
import { recordRedemption } from "../promotions/repository";
import type { EnginePromotion } from "../promotions/contracts";
import type { OrderLineInput } from "./contracts";
import type { Quote } from "./quote";

export interface PersistLinesOptions {
  /** The requested lines, for the reason given for a manual price. */
  inputs?: readonly OrderLineInput[];
  actorId?: string | null;
  /** The offers the quote was priced with, for their invoice wording. */
  promotions?: readonly EnginePromotion[];
  /** Product image snapshot per variant, when the channel has one. */
  images?: ReadonlyMap<string, string | null>;
}

export async function persistOrderLines(
  client: Tx,
  orderId: string,
  quote: Quote,
  options: PersistLinesOptions = {},
): Promise<void> {
  const invoiceLabel = new Map(
    (options.promotions ?? [])
      .filter((p) => p.invoiceLabel)
      .map((p) => [p.id, p.invoiceLabel!] as const),
  );

  const rows = quote.lines.map((line) => {
    const manual = line.discountCents - line.promotionDiscountCents;
    const input = options.inputs?.find((l) => l.variantId === line.variantId);
    return {
      id: randomUUID(),
      orderId,
      productId: line.productId,
      variantId: line.variantId,
      quantity: line.quantity,
      priceCents: line.priceCents,
      catalogPriceCents: line.catalogPriceCents,
      unitCostCents: line.unitCostCents,
      name: line.name,
      image: options.images?.get(line.variantId) ?? null,
      variantName: line.variantName,
      sku: line.sku,
      barcode: line.barcode,
      discountCents: line.discountCents,
      promotionDiscountCents: line.promotionDiscountCents,
      taxCents: line.taxCents,
      taxRateBps: line.taxRateBps,
      // Only a price changed by hand needs a reason and a name against it.
      overrideReason: manual > 0 ? (input?.overrideReason ?? null) : null,
      overriddenBy: manual > 0 ? (options.actorId ?? null) : null,
    };
  });

  await client.orderItem.createMany({ data: rows });

  await recordRedemption(
    client,
    orderId,
    quote.lines.map((line, index) => ({
      orderItemId: rows[index].id,
      allocations: line.allocations.map((a) => ({
        ...a,
        label: invoiceLabel.get(a.promotionId) ?? a.label,
      })),
    })),
    quote.applied,
  );
}

/** The receipt's list of offers, frozen onto the order. */
export function appliedSnapshot(quote: Quote) {
  return quote.applied.length
    ? quote.applied.map((a) => ({
        promotionId: a.promotionId,
        label: a.label,
        code: a.code,
        savingCents: a.savingCents,
      }))
    : undefined;
}
