/**
 * The Orders domain's service.
 *
 * Creating an order and consuming the stock it sells happen in ONE
 * transaction. That is the whole point: an order that exists has always had
 * its stock accounted for, and stock that left the shelf always has an order
 * explaining why. Neither can be true without the other.
 *
 * Both channels come through here. A counter sale and an online checkout
 * differ only in `source` and in whether stock was reserved beforehand.
 */
import { prisma, type Tx } from "../_shared/db";
import { DomainError } from "../_shared/errors";
import { OrderId, VariantId } from "../_shared/ids";
import { catalogService, withdrawSoldOutRetiredProducts } from "../catalog";
import { inventoryService } from "../inventory";
import type { CreateOrderInput, CreatedOrder, OrdersPort } from "./contracts";
import { GST_RATE_BPS } from "./pricing";
import { quoteCart, type Quote } from "./quote";
import { appliedSnapshot, persistOrderLines } from "./persist-lines";

/**
 * Order numbers are date-stamped and random, not sequential.
 *
 * Deliberately NOT a running counter: an order number is shown to customers,
 * and a sequential one tells every customer how many orders the shop has
 * taken. Invoice numbers are sequential because tax law requires it — that is
 * a separate identifier, generated in the Billing domain.
 */
function generateOrderNumber(now: Date): string {
  const stamp = now.toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `LVI-${stamp}-${random}`;
}

class OrderService implements OrdersPort {
  async createOrder(input: CreateOrderInput, tx?: Tx): Promise<CreatedOrder> {
    if (input.lines.length === 0) {
      throw new DomainError("VALIDATION_FAILED", "An order needs at least one item");
    }

    // Prices come from the catalog, never from the caller.
    const variantIds = input.lines.map((line) => VariantId(line.variantId));
    const variants = await catalogService.findVariantsByIds(variantIds);
    const byId = new Map(variants.map((variant) => [variant.variantId as string, variant]));

    // Draft is a statement about the website, not about the piece.
    //
    // An unpublished product is one the shop has not listed online yet;
    // it is still made, still on the shelf and still sellable at the
    // counter. So the publish gate is applied to ONLINE orders only. The
    // storefront's own queries already hide drafts, and this is the
    // matching guard on the write path, which is what stops a draft being
    // bought online by anyone who has the variant id.
    if (input.source === "ONLINE") {
      const unlisted = variants.filter((variant) => !variant.isPublished);
      if (unlisted.length > 0) {
        throw new DomainError(
          "VARIANT_NOT_FOUND",
          unlisted.length === 1
            ? `"${unlisted[0].productName}" is not available to buy online`
            : `${unlisted.length} of these items are not available to buy online`,
          { variantIds: unlisted.map((variant) => variant.variantId as string) },
        );
      }
    }

    // One pricing path for both channels: catalog, manual prices, offers,
    // then GST per line.
    const quote = quoteCart(
      {
        channel: input.source,
        lines: input.lines,
        promotions: input.pricing?.promotions ?? [],
        codes: input.pricing?.codes,
        customer: input.pricing?.customer,
        paymentMethod: input.pricing?.paymentMethod,
        shippingCents: input.shippingCents,
        manualOrderDiscountCents: input.discountCents,
        pricesIncludeTax: input.pricing?.pricesIncludeTax ?? false,
        taxRateBps: GST_RATE_BPS,
      },
      byId,
    );

    if (
      input.expectedGrandTotalCents !== undefined &&
      quote.totals.grandTotalCents > input.expectedGrandTotalCents
    ) {
      throw new DomainError(
        "PRICE_CHANGED",
        "The total has changed — an offer may have ended. Check the new total with the client.",
        { grandTotalCents: quote.totals.grandTotalCents },
      );
    }

    const run = (client: Tx) => this.write(client, input, quote);
    return tx ? run(tx) : prisma.$transaction(run, { timeout: 15_000 });
  }

  private async write(
    client: Tx,
    input: CreateOrderInput,
    quote: Quote,
  ): Promise<CreatedOrder> {
    const now = new Date();
    const { lines, totals } = quote;

    // A retried submission must not create a second order. The order number
    // is unique, so an existing one for this key means the first attempt
    // already succeeded.
    if (input.idempotencyKey) {
      const existing = await client.order.findFirst({
        where: { notes: { contains: `idem:${input.idempotencyKey}` } },
        select: { id: true, orderNumber: true, createdAt: true },
      });
      if (existing) {
        return {
          orderId: OrderId(existing.id),
          orderNumber: existing.orderNumber,
          source: input.source,
          lines,
          totals,
          createdAt: existing.createdAt,
        };
      }
    }

    const notes = [input.notes, input.idempotencyKey ? `idem:${input.idempotencyKey}` : null]
      .filter(Boolean)
      .join(" ") || null;

    const order = await client.order.create({
      data: {
        orderNumber: generateOrderNumber(now),
        source: input.source,
        userId: input.customer?.customerId ?? null,
        addressId: input.customer?.addressId ?? null,
        customerName: input.customer?.name ?? null,
        customerMobile: input.customer?.mobile ?? null,
        customerGstin: input.customer?.gstin ?? null,
        totalCents: totals.subtotalCents,
        shippingCents: totals.shippingCents,
        taxCents: totals.taxCents,
        taxIncluded: totals.taxIncluded,
        discountCents: totals.discountCents,
        discountCode:
          quote.applied.find((a) => a.code)?.code ?? input.discountCode ?? null,
        appliedPromotions: appliedSnapshot(quote),
        status: input.status ?? (input.source === "STORE" ? "DELIVERED" : "PENDING"),
        paymentStatus: input.payment.status,
        paymentMethod: input.payment.method,
        paymentId: input.payment.reference ?? null,
        notes,
        createdAt: now,
      },
      select: { id: true, orderNumber: true, createdAt: true },
    });

    await persistOrderLines(client, order.id, quote, {
      inputs: input.lines,
      actorId: input.actorId,
      promotions: input.pricing?.promotions,
    });

    await client.payment.create({
      data: {
        orderId: order.id,
        amountCents: totals.grandTotalCents,
        currency: "INR",
        method: input.payment.method,
        status: input.payment.status,
        reference: input.payment.reference ?? null,
        payerVpa: input.payment.payerVpa ?? null,
        utr: input.payment.utr ?? null,
        createdAt: now,
      },
    });

    await client.orderTracking.create({
      data: {
        orderId: order.id,
        status: input.source === "STORE" ? "Sold at the counter" : "Order placed",
        updatedBy: input.actorId ?? "system",
        createdAt: now,
      },
    });

    // Stock moves in the same transaction. If this fails — someone else took
    // the last piece a moment earlier — the whole order rolls back rather
    // than leaving a sale with no stock behind it.
    await inventoryService.commitSale(
      lines.map((line) => ({ variantId: line.variantId, quantity: line.quantity })),
      { referenceType: "ORDER", referenceId: order.id, actorId: input.actorId ?? "system" },
      client,
    );
    // A retired piece that just sold its last unit leaves the storefront now.
    await withdrawSoldOutRetiredProducts(client, {
      variantIds: lines.map((line) => line.variantId),
    });

    return {
      orderId: OrderId(order.id),
      orderNumber: order.orderNumber,
      source: input.source,
      lines,
      totals,
      createdAt: order.createdAt,
    };
  }
}

export const orderService: OrdersPort = new OrderService();
