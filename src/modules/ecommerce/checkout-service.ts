/**
 * The Ecommerce domain's checkout.
 *
 * The storefront's cart lives in the browser, which makes it a statement of
 * intent and nothing more. Everything that matters is decided here, server
 * side: what things cost, whether they are in stock, and whether the sale may
 * proceed. A client that could influence any of those is a shop anyone could
 * rob with a browser console.
 *
 * Online differs from the counter in one way: payment happens elsewhere and
 * takes time. So stock is HELD while the customer pays, and only consumed
 * once payment is confirmed:
 *
 *     reserve  →  customer pays  →  commit   (sale completes)
 *                              ↘  release   (failed, cancelled, abandoned)
 *
 * Without the hold, two people can pay for the same last piece and one of
 * them has to be told afterwards — which is the failure this whole design
 * exists to prevent.
 */
import { prisma, type Tx } from "../_shared/db";
import { DomainError, InsufficientStockError } from "../_shared/errors";
import { VariantId, type OrderId } from "../_shared/ids";
import { catalogService } from "../catalog";
import { inventoryService } from "../inventory";

export interface CheckoutLineInput {
  variantId: string;
  quantity: number;
}

export interface CheckoutValidation {
  ok: boolean;
  /** Lines that cannot be fulfilled, with what is actually available. */
  problems: {
    variantId: string;
    productName: string;
    requested: number;
    available: number;
  }[];
  /** Server-resolved totals, in paisa. Never taken from the client. */
  subtotalCents: number;
}

class CheckoutService {
  /**
   * Checks a basket before payment begins.
   *
   * Advisory only — it tells the shopper what is wrong before they reach for
   * a card. It is NOT what prevents overselling; the reservation below does
   * that, atomically. Checking then acting would be a race.
   */
  async validate(lines: readonly CheckoutLineInput[]): Promise<CheckoutValidation> {
    if (lines.length === 0) {
      throw new DomainError("VALIDATION_FAILED", "Your basket is empty");
    }

    const variantIds = lines.map((line) => VariantId(line.variantId));
    const [variants, levels] = await Promise.all([
      catalogService.findVariantsByIds(variantIds),
      inventoryService.getLevels(variantIds),
    ]);
    const byId = new Map(variants.map((variant) => [variant.variantId as string, variant]));

    const problems: CheckoutValidation["problems"] = [];
    let subtotalCents = 0;

    for (const line of lines) {
      const variant = byId.get(line.variantId);
      if (!variant || !variant.isActive) {
        problems.push({
          variantId: line.variantId,
          productName: variant?.productName ?? "This item",
          requested: line.quantity,
          available: 0,
        });
        continue;
      }

      // Price comes from the catalog every time.
      subtotalCents += variant.priceCents * line.quantity;

      const available = levels.get(line.variantId)?.available ?? 0;
      if (available < line.quantity) {
        problems.push({
          variantId: line.variantId,
          productName: variant.productName,
          requested: line.quantity,
          available,
        });
      }
    }

    return { ok: problems.length === 0, problems, subtotalCents };
  }

  /**
   * Holds stock for an order that is about to be paid for.
   *
   * The hold is named after the order and expires on its own, so an abandoned
   * checkout returns its stock to the shelf without anyone noticing it was
   * gone. Fails loudly rather than overselling.
   */
  async reserveForOrder(
    orderId: OrderId,
    lines: readonly CheckoutLineInput[],
    tx?: Tx,
  ): Promise<void> {
    await inventoryService.reserve(
      lines.map((line) => ({
        variantId: VariantId(line.variantId),
        quantity: line.quantity,
      })),
      { referenceType: "ORDER", referenceId: orderId, actorId: "storefront" },
      tx,
    );
  }

  /**
   * Turns the hold into a sale once payment is confirmed.
   *
   * Settles the existing reservation rather than taking stock afresh — the
   * units were already set aside, so this converts them rather than
   * double-counting.
   */
  async commitPaidOrder(
    orderId: OrderId,
    lines: readonly CheckoutLineInput[],
    tx?: Tx,
  ): Promise<void> {
    await inventoryService.commitSale(
      lines.map((line) => ({
        variantId: VariantId(line.variantId),
        quantity: line.quantity,
      })),
      {
        referenceType: "ORDER",
        referenceId: orderId,
        actorId: "storefront",
        fromReservation: true,
      },
      tx,
    );
  }

  /**
   * Returns held stock after a failed, cancelled or abandoned payment.
   *
   * Never throws: releasing is cleanup, and a release that fails because the
   * hold already expired must not turn into an error the shopper sees.
   */
  async releaseForOrder(
    orderId: OrderId,
    lines: readonly CheckoutLineInput[],
    tx?: Tx,
  ): Promise<void> {
    try {
      await inventoryService.release(
        lines.map((line) => ({
          variantId: VariantId(line.variantId),
          quantity: line.quantity,
        })),
        { referenceType: "ORDER", referenceId: orderId, actorId: "storefront" },
        tx,
      );
    } catch (error) {
      if (error instanceof InsufficientStockError) return;
      console.error(`Could not release the hold for order ${orderId}:`, error);
    }
  }
}

export const checkoutService = new CheckoutService();
