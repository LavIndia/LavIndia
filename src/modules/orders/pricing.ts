/**
 * Turning what was asked for into what is actually charged.
 *
 * Prices are ALWAYS resolved from the catalog, never taken from the client.
 * An override is allowed, but it is recorded as an override against the
 * catalog price rather than replacing it — so a discount stays visible as a
 * discount on the invoice and in reporting, instead of vanishing into a
 * changed price nobody can account for later.
 */
import { taxFromBps } from "../_shared/money";
import { DomainError } from "../_shared/errors";
import { VariantId } from "../_shared/ids";
import type { SellableVariant } from "../catalog";
import type { OrderLineInput, OrderLineSnapshot, OrderTotals } from "./contracts";

/**
 * GST on jewellery, in basis points. 300 = 3%.
 *
 * Held here rather than in the invoice template, because tax is a property of
 * the sale, not of how the sale is printed.
 */
export const GST_RATE_BPS = 300;

export function priceLines(
  lines: readonly OrderLineInput[],
  variants: Map<string, SellableVariant>,
): OrderLineSnapshot[] {
  return lines.map((line) => {
    const variant = variants.get(line.variantId);
    if (!variant) {
      throw new DomainError("VARIANT_NOT_FOUND", "That item is no longer available", {
        variantId: line.variantId,
      });
    }
    if (!Number.isInteger(line.quantity) || line.quantity <= 0) {
      throw new DomainError("INVALID_QUANTITY", "Quantity must be a whole number above zero", {
        variantId: line.variantId,
      });
    }

    const catalogPriceCents = variant.priceCents;
    const hasOverride = typeof line.overridePriceCents === "number";

    if (hasOverride) {
      const override = line.overridePriceCents!;
      if (!Number.isInteger(override) || override < 0) {
        throw new DomainError("VALIDATION_FAILED", "An overridden price must be a whole number", {
          variantId: line.variantId,
        });
      }
    }

    const priceCents = hasOverride ? line.overridePriceCents! : catalogPriceCents;

    // A price below catalog is recorded as a discount, so the invoice can
    // show what was given away rather than merely a lower number.
    const discountPerUnit = Math.max(0, catalogPriceCents - priceCents);
    const discountCents = discountPerUnit * line.quantity;
    const lineNetCents = priceCents * line.quantity;
    const taxCents = taxFromBps(lineNetCents, GST_RATE_BPS);

    return {
      variantId: VariantId(variant.variantId),
      productId: variant.productId,
      name: variant.productName,
      variantName: variant.isDefault ? null : variant.variantName,
      sku: variant.sku,
      barcode: variant.barcode,
      quantity: line.quantity,
      catalogPriceCents,
      priceCents,
      discountCents,
      taxCents,
      taxRateBps: GST_RATE_BPS,
      lineTotalCents: lineNetCents,
    };
  });
}

export function totalsFor(
  lines: readonly OrderLineSnapshot[],
  options: { shippingCents?: number; orderDiscountCents?: number } = {},
): OrderTotals {
  const subtotalCents = lines.reduce((sum, line) => sum + line.lineTotalCents, 0);
  const lineDiscountCents = lines.reduce((sum, line) => sum + line.discountCents, 0);
  const orderDiscountCents = options.orderDiscountCents ?? 0;
  const shippingCents = options.shippingCents ?? 0;

  // An order-level discount comes off the already-net subtotal; tax follows
  // the money actually charged, not the list price.
  const taxableCents = Math.max(0, subtotalCents - orderDiscountCents);
  const taxCents = taxFromBps(taxableCents, GST_RATE_BPS);

  return {
    subtotalCents,
    discountCents: lineDiscountCents + orderDiscountCents,
    taxCents,
    shippingCents,
    grandTotalCents: taxableCents + taxCents + shippingCents,
  };
}
