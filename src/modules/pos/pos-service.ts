/**
 * The POS domain's service.
 *
 * POS owns the act of selling at the counter and nothing else. It does not
 * own products, stock, orders or invoices — it orchestrates them:
 *
 *     Catalog    resolves what was scanned
 *     Orders     records the sale and consumes the stock
 *     Billing    issues the invoice
 *
 * All of it in ONE transaction. A counter sale is a single moment: the
 * customer pays, the piece leaves, the bill prints. Any of those succeeding
 * without the others is a broken shop, so they commit together or not at all.
 */
import { prisma, type Tx } from "../_shared/db";
import { DomainError } from "../_shared/errors";
import { CustomerId, type OrderId } from "../_shared/ids";
import { billingService } from "../billing/billing-service";
import { orderService } from "../orders/order-service";
import type { OrderLineInput, PosPaymentMethod } from "../orders/contracts";
import type { InvoiceSnapshot } from "../billing/invoices/invoice-types";

export interface PosSaleInput {
  lines: readonly OrderLineInput[];
  payment: {
    method: PosPaymentMethod;
    /** UPI transaction id, card approval code, or a note for "other". */
    reference?: string;
    payerVpa?: string;
    utr?: string;
  };
  customer?: {
    customerId?: string;
    name?: string;
    mobile?: string;
    gstin?: string;
  };
  /** An order-level discount in paisa, on top of any per-line override. */
  discountCents?: number;
  notes?: string;
  actorId: string;
  idempotencyKey?: string;
}

export interface PosSaleResult {
  orderId: OrderId;
  orderNumber: string;
  invoiceNumber: string;
  invoice: InvoiceSnapshot;
  grandTotalCents: number;
}

class PosService {
  /**
   * Rings up a sale.
   *
   * A counter sale is paid before the customer leaves, so the order is
   * created already settled: payment COMPLETED, status DELIVERED. There is no
   * fulfilment step to wait for — the piece is in their hand.
   */
  async completeSale(input: PosSaleInput, tx?: Tx): Promise<PosSaleResult> {
    if (input.lines.length === 0) {
      throw new DomainError("VALIDATION_FAILED", "Add something to the sale first");
    }

    const run = async (client: Tx): Promise<PosSaleResult> => {
      const order = await orderService.createOrder(
        {
          source: "STORE",
          lines: input.lines,
          customer: input.customer
            ? {
                customerId: input.customer.customerId
                  ? CustomerId(input.customer.customerId)
                  : undefined,
                name: input.customer.name,
                mobile: input.customer.mobile,
                gstin: input.customer.gstin,
              }
            : undefined,
          payment: {
            method: input.payment.method,
            status: "COMPLETED",
            reference: input.payment.reference,
            payerVpa: input.payment.payerVpa,
            utr: input.payment.utr,
          },
          status: "DELIVERED",
          discountCents: input.discountCents,
          notes: input.notes,
          actorId: input.actorId,
          idempotencyKey: input.idempotencyKey,
        },
        client,
      );

      // The bill is part of the same moment, not a follow-up task.
      const invoice = await billingService.issueInvoiceForOrder(
        order.orderId,
        input.actorId,
        client,
      );

      return {
        orderId: order.orderId,
        orderNumber: order.orderNumber,
        invoiceNumber: invoice.invoiceNumber,
        invoice: invoice.snapshot,
        grandTotalCents: order.totals.grandTotalCents,
      };
    };

    return tx ? run(tx) : prisma.$transaction(run, { timeout: 20_000 });
  }
}

export const posService = new PosService();
