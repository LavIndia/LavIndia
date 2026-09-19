/**
 * The Billing domain's service.
 *
 * Billing consumes a completed order and owns nothing else — no products, no
 * stock, no catalog price. It reads the order's frozen line snapshots, takes
 * an invoice number, and stores a fully-rendered payload.
 *
 * After that the invoice is self-contained: rendering it reads only the
 * snapshot, so the document is immutable even though the catalog moves on.
 */
import { prisma, type Tx } from "../_shared/db";
import { DomainError } from "../_shared/errors";
import { InvoiceId, type OrderId } from "../_shared/ids";
import { greetingForInvoiceNumber } from "./invoices/greetings";
import { allocateInvoiceNumber } from "./invoices/invoice-number";
import type { InvoiceSnapshot } from "./invoices/invoice-types";

export interface IssuedInvoice {
  invoiceId: InvoiceId;
  invoiceNumber: string;
  snapshot: InvoiceSnapshot;
}

export interface BillingPort {
  /** Issues the invoice for a completed order. One invoice per order. */
  issueInvoiceForOrder(orderId: OrderId, actorId?: string, tx?: Tx): Promise<IssuedInvoice>;
  getInvoiceByOrder(orderId: OrderId): Promise<IssuedInvoice | null>;
}

class BillingService implements BillingPort {
  async issueInvoiceForOrder(
    orderId: OrderId,
    actorId?: string,
    tx?: Tx,
  ): Promise<IssuedInvoice> {
    const run = (client: Tx) => this.issue(client, orderId, actorId);
    return tx ? run(tx) : prisma.$transaction(run, { timeout: 15_000 });
  }

  private async issue(client: Tx, orderId: OrderId, actorId?: string): Promise<IssuedInvoice> {
    // One invoice per order, enforced by a unique key. A retry returns the
    // existing invoice rather than burning a second number.
    const existing = await client.invoice.findUnique({ where: { orderId } });
    if (existing) {
      return {
        invoiceId: InvoiceId(existing.id),
        invoiceNumber: existing.invoiceNumber,
        snapshot: existing.snapshot as unknown as InvoiceSnapshot,
      };
    }

    const order = await client.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        payment: true,
        address: true,
        user: { select: { name: true, email: true, mobile: true } },
      },
    });
    if (!order) throw new DomainError("ORDER_NOT_FOUND", "That order no longer exists");

    const settings = await client.siteSettings.findFirst();
    const issuedAt = new Date();
    const allocated = await allocateInvoiceNumber(client, issuedAt);

    const addressLines = order.address
      ? [
          order.address.addressLine1,
          order.address.addressLine2,
          `${order.address.city}, ${order.address.state} ${order.address.pincode}`,
        ].filter((line): line is string => Boolean(line))
      : [];

    const snapshot: InvoiceSnapshot = {
      invoiceNumber: allocated.invoiceNumber,
      issuedAt: issuedAt.toISOString(),
      orderNumber: order.orderNumber,
      source: order.source,
      currency: "INR",
      business: {
        name: settings?.businessName ?? "LavIndia",
        address: settings?.address ?? null,
        contactNumber: settings?.contactNumber ?? null,
        email: settings?.email ?? null,
        gstNumber: settings?.gstNumber ?? null,
      },
      customer: {
        // The order's own snapshot wins over the linked account, because it
        // records who the sale was actually for at the time.
        name: order.customerName ?? order.user?.name ?? null,
        mobile: order.customerMobile ?? order.user?.mobile ?? null,
        email: order.user?.email ?? null,
        gstin: order.customerGstin ?? null,
        addressLines,
      },
      lines: order.items.map((item, index) => ({
        position: index + 1,
        description: item.name,
        variantName: item.variantName,
        sku: item.sku,
        hsnCode: item.hsnCode,
        quantity: item.quantity,
        unitPriceCents: item.priceCents,
        catalogPriceCents:
          item.catalogPriceCents !== item.priceCents ? item.catalogPriceCents : null,
        discountCents: item.discountCents,
        taxCents: item.taxCents,
        taxRateBps: item.taxRateBps ?? 0,
        lineTotalCents: item.priceCents * item.quantity,
      })),
      totals: {
        subtotalCents: order.totalCents,
        discountCents: order.discountCents,
        taxCents: order.taxCents,
        shippingCents: order.shippingCents,
        grandTotalCents:
          order.totalCents - order.discountCents + order.taxCents + order.shippingCents,
      },
      payment: {
        method: order.paymentMethod ?? "—",
        reference: order.payment?.reference ?? order.paymentId ?? null,
        status: order.paymentStatus,
        payerVpa: order.payment?.payerVpa ?? null,
        utr: order.payment?.utr ?? null,
      },
      greeting: greetingForInvoiceNumber(allocated.invoiceNumber),
    };

    const invoice = await client.invoice.create({
      data: {
        invoiceNumber: allocated.invoiceNumber,
        orderId,
        financialYear: allocated.financialYear,
        sequence: allocated.sequence,
        issuedAt,
        subtotalCents: snapshot.totals.subtotalCents,
        discountCents: snapshot.totals.discountCents,
        taxCents: snapshot.totals.taxCents,
        totalCents: snapshot.totals.grandTotalCents,
        snapshot: snapshot as unknown as object,
        createdBy: actorId ?? null,
      },
      select: { id: true },
    });

    return {
      invoiceId: InvoiceId(invoice.id),
      invoiceNumber: allocated.invoiceNumber,
      snapshot,
    };
  }

  async getInvoiceByOrder(orderId: OrderId): Promise<IssuedInvoice | null> {
    const invoice = await prisma.invoice.findUnique({ where: { orderId } });
    if (!invoice) return null;
    return {
      invoiceId: InvoiceId(invoice.id),
      invoiceNumber: invoice.invoiceNumber,
      snapshot: invoice.snapshot as unknown as InvoiceSnapshot,
    };
  }
}

export const billingService: BillingPort = new BillingService();
