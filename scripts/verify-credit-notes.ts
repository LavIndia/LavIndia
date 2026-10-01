/**
 * Verifies credit notes, refund recording and a payment that lands after its
 * order was cancelled.
 *
 *     npx tsx scripts/verify-credit-notes.ts
 *
 * Local database only. Every row it writes is removed again, and the test
 * variant's stock and the invoice and credit note counters are put back as
 * they were.
 */
// Must come first: populates process.env before anything reads it.
import "./load-env";
import { assertLocalDatabase } from "../prisma/guard-destructive";
import { prisma } from "../src/lib/prisma";
import { financialYearFor } from "../src/modules/billing";
import { catalogService } from "../src/modules/catalog";
import { checkoutService, settleGatewayPayment } from "../src/modules/ecommerce";
import { inventoryService } from "../src/modules/inventory";
import {
  changeOrderStatus,
  isRefundOwed,
  orderService,
  recordRefund,
  refundInputSchema,
} from "../src/modules/orders";
import { isDomainError } from "../src/modules/_shared/errors";
import { OrderId, VariantId } from "../src/modules/_shared/ids";
import type { OrderStatus } from "@prisma/client";
import { check, errorCode, results } from "./verify-helpers";

const STOCK = 5;

async function main(): Promise<void> {
  assertLocalDatabase("scripts/verify-credit-notes.ts");

  const [variant] = await catalogService.searchVariants({ limit: 1, sellableOnly: true });
  if (!variant) throw new Error("No sellable variant to test against");
  const variantId = VariantId(variant.variantId);
  const locationId = await inventoryService.getDefaultLocationId();
  const level = await prisma.inventoryLevel.findUnique({
    where: { variantId_locationId: { variantId, locationId } },
  });
  const [invoiceSeqs, noteSeqs] = await Promise.all([
    prisma.invoiceSequence.findMany(),
    prisma.creditNoteSequence.findMany(),
  ]);
  const orderIds: string[] = [];
  const run = Date.now();

  const stock = async () => {
    const row = await prisma.inventoryLevel.findUnique({
      where: { variantId_locationId: { variantId, locationId } },
      select: { quantity: true, reservedQuantity: true },
    });
    return [row?.quantity, row?.reservedQuantity];
  };
  const move = (id: string, status: OrderStatus) =>
    prisma.$transaction((tx) => changeOrderStatus(tx, id, status, "verify"), { timeout: 20_000 });
  const notes = (orderId: string) =>
    prisma.creditNote.findMany({ where: { orderId }, orderBy: { sequence: "asc" } });
  const orderState = (id: string) =>
    prisma.order.findUniqueOrThrow({
      where: { id },
      select: {
        status: true,
        paymentStatus: true,
        payment: { select: { status: true, refundedCents: true, refundMethod: true, refundReference: true, metadata: true } },
      },
    });
  const pay = (orderId: string, n: number) =>
    settleGatewayPayment({
      orderId,
      razorpayOrderId: `order_verify_${run}_${n}`,
      razorpayPaymentId: `pay_verify_${run}_${n}`,
      razorpaySignature: "verified-by-script",
      instrument: {},
    });

  // An online order as api/orders/create writes it.
  const onlineOrder = async (method: "cod" | "razorpay") =>
    prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          orderNumber: `VERIFY-CN-${method}-${run}-${orderIds.length}`,
          totalCents: variant.priceCents,
          paymentMethod: method,
          paymentStatus: "PENDING",
          status: method === "cod" ? "PROCESSING" : "PENDING",
          items: { create: { variantId, quantity: 1, priceCents: variant.priceCents, name: "Verify" } },
          payment: {
            create: { amountCents: variant.priceCents, method, status: method === "cod" ? "COMPLETED" : "PENDING" },
          },
        },
      });
      orderIds.push(created.id);
      const lines = [{ variantId, quantity: 1 }];
      await checkoutService.reserveForOrder(OrderId(created.id), lines, tx);
      if (method === "cod") await checkoutService.commitPaidOrder(OrderId(created.id), lines, tx);
      return created.id;
    });
  const lapseHold = (orderId: string) =>
    inventoryService.release([{ variantId, quantity: 1 }], {
      locationId,
      referenceType: "ORDER",
      referenceId: orderId,
      reason: "Reservation expired",
      actorId: "system",
    });

  try {
    await prisma.inventoryLevel.upsert({
      where: { variantId_locationId: { variantId, locationId } },
      create: { variantId, locationId, quantity: STOCK },
      update: { quantity: STOCK, reservedQuantity: 0 },
    });

    console.log("Financial year is read in India time");
    check("1 Apr 00:00 IST is the new year", financialYearFor(new Date("2027-03-31T18:30:00Z")), "27-28");
    check("31 Mar 23:59 IST is the old year", financialYearFor(new Date("2027-03-31T18:29:59Z")), "26-27");

    console.log("Cancelling a billed order issues one credit note");
    const billed = await onlineOrder("cod");
    await move(billed, "SHIPPED");
    const invoice = await prisma.invoice.findUniqueOrThrow({ where: { orderId: billed } });
    await move(billed, "CANCELLED");
    let issued = await notes(billed);
    check("one credit note", issued.length, 1);
    const first = issued[0]!;
    check("numbered CN/<FY>/<6 digits>", /^CN\/\d{2}-\d{2}\/\d{6}$/.test(first.creditNoteNumber), true);
    check("number carries this financial year", first.financialYear, financialYearFor(new Date()));
    check("credits the whole invoice", [first.totalCents, first.taxCents, first.subtotalCents], [invoice.totalCents, invoice.taxCents, invoice.subtotalCents]);
    const snapshot = first.snapshot as { reason: string; invoice: { invoiceNumber: string }; lines: unknown[] };
    check("snapshot names the reason", snapshot.reason, "Order cancelled");
    check("snapshot names the invoice", snapshot.invoice.invoiceNumber, invoice.invoiceNumber);
    check("snapshot carries the invoice lines", snapshot.lines.length, (invoice.snapshot as { lines: unknown[] }).lines.length);
    check("invoice kept, still issued", (await prisma.invoice.findUnique({ where: { orderId: billed } }))?.status, invoice.status);

    console.log("Refunding after cancelling issues nothing more");
    await move(billed, "REFUNDED");
    await move(billed, "CANCELLED");
    issued = await notes(billed);
    check("still one credit note", issued.length, 1);
    check("still the first reason", issued[0]?.reason, "Order cancelled");
    check("reopening a credited order is refused", await errorCode(() => move(billed, "PROCESSING")), "CONFLICT");
    check("order left closed", (await orderState(billed)).status, "CANCELLED");

    console.log("Numbering runs on, unbroken");
    const second = await onlineOrder("cod");
    await move(second, "SHIPPED");
    await Promise.all([move(second, "REFUNDED"), move(second, "CANCELLED")]);
    const secondNotes = await notes(second);
    check("one note under a simultaneous cancel and refund", secondNotes.length, 1);
    check("next number in sequence", secondNotes[0]?.sequence, first.sequence + 1);

    console.log("An order never billed has nothing to credit");
    const unbilled = await onlineOrder("razorpay");
    await move(unbilled, "CANCELLED");
    check("no credit note", (await notes(unbilled)).length, 0);

    console.log("Recording a refund");
    const sale = await orderService.createOrder({
      source: "STORE",
      lines: [{ variantId, quantity: 1 }],
      payment: { method: "CASH", status: "COMPLETED" },
      actorId: "verify",
    });
    orderIds.push(sale.orderId);
    const paid = (await prisma.payment.findUniqueOrThrow({ where: { orderId: sale.orderId } })).amountCents;
    const refundOn = (id: string, input: unknown) =>
      prisma.$transaction((tx) => recordRefund(tx, id, refundInputSchema.parse(input)));
    check("refused before the order is closed", await errorCode(() => refundOn(sale.orderId, { amountCents: 100, method: "CASH" })), "VALIDATION_FAILED");
    await move(sale.orderId, "CANCELLED");
    check("paid and cancelled reads as refund owed", isRefundOwed(await orderState(sale.orderId)), true);
    check("zero amount rejected", refundInputSchema.safeParse({ amountCents: 0, method: "UPI" }).success, false);
    check("fractional paise rejected", refundInputSchema.safeParse({ amountCents: 10.5, method: "UPI" }).success, false);
    check("unknown method rejected", refundInputSchema.safeParse({ amountCents: 100, method: "RAZORPAY" }).success, false);
    check("over-long reference rejected", refundInputSchema.safeParse({ amountCents: 100, method: "UPI", reference: "x".repeat(121) }).success, false);
    check("more than was paid refused", await errorCode(() => refundOn(sale.orderId, { amountCents: paid + 1, method: "CASH" })), "VALIDATION_FAILED");
    check("unpaid order refused", await errorCode(() => refundOn(unbilled, { amountCents: 100, method: "UPI" })), "VALIDATION_FAILED");
    await refundOn(sale.orderId, { amountCents: paid - 100, method: "UPI", reference: "  UTR123  " });
    let state = await orderState(sale.orderId);
    check("part refund saved, reference trimmed", [state.payment?.refundedCents, state.payment?.refundMethod, state.payment?.refundReference], [paid - 100, "UPI", "UTR123"]);
    check("no longer owed once recorded", isRefundOwed(state), false);
    check("order stays cancelled until the admin moves it", state.status, "CANCELLED");
    await move(sale.orderId, "REFUNDED");
    state = await orderState(sale.orderId);
    check("refunded order marks the payment refunded", [state.status, state.paymentStatus, state.payment?.refundedCents], ["REFUNDED", "REFUNDED", paid - 100]);

    console.log("A payment that lands after the order was cancelled");
    await prisma.inventoryLevel.update({ where: { variantId_locationId: { variantId, locationId } }, data: { quantity: STOCK, reservedQuantity: 0 } });
    const late = await onlineOrder("razorpay");
    await move(late, "CANCELLED");
    check("hold released on cancel", await stock(), [STOCK, 0]);
    check("settles as closed, not an error", await pay(late, 1), "CLOSED");
    state = await orderState(late);
    check("payment recorded, order still cancelled", [state.status, state.paymentStatus, state.payment?.status], ["CANCELLED", "COMPLETED", "COMPLETED"]);
    check("marked paid after cancellation", (state.payment?.metadata as Record<string, unknown>)?.paidAfterCancellation, true);
    check("reads as refund owed", isRefundOwed(state), true);
    check("no stock taken", await stock(), [STOCK, 0]);
    check("no invoice raised", await prisma.invoice.count({ where: { orderId: late } }), 0);
    check("the same confirmation again changes nothing", await pay(late, 1), "CLOSED");
    check("reopening it is refused", await errorCode(() => move(late, "PENDING")), "CONFLICT");

    console.log("A normal payment, and its repeat");
    const normal = await onlineOrder("razorpay");
    check("settles as paid", await pay(normal, 2), "PAID");
    check("hold became a sale", await stock(), [STOCK - 1, 0]);
    check("invoice raised", await prisma.invoice.count({ where: { orderId: normal } }), 1);
    check("repeat is already paid", await pay(normal, 2), "ALREADY_PAID");
    check("stock taken once", await stock(), [STOCK - 1, 0]);

    console.log("A hold that lapsed, with the piece still on the shelf");
    const lapsed = await onlineOrder("razorpay");
    await lapseHold(lapsed);
    check("settles as paid", await pay(lapsed, 3), "PAID");
    check("taken fresh from the shelf", await stock(), [STOCK - 2, 0]);

    console.log("A hold that lapsed, and the piece sold meanwhile");
    const soldOut = await onlineOrder("razorpay");
    await lapseHold(soldOut);
    await prisma.inventoryLevel.update({ where: { variantId_locationId: { variantId, locationId } }, data: { quantity: 0 } });
    check("settles as closed", await pay(soldOut, 4), "CLOSED");
    state = await orderState(soldOut);
    check("order cancelled, payment kept", [state.status, state.paymentStatus], ["CANCELLED", "COMPLETED"]);
    check("reads as refund owed", isRefundOwed(state), true);
    check("no invoice raised", await prisma.invoice.count({ where: { orderId: soldOut } }), 0);
    check("nothing oversold", await stock(), [0, 0]);
  } finally {
    await prisma.inventoryMovement.deleteMany({ where: { referenceType: "ORDER", referenceId: { in: orderIds } } });
    await prisma.inventoryReservation.deleteMany({ where: { referenceType: "ORDER", referenceId: { in: orderIds } } });
    // Invoices, credit notes, payments and tracking go with their orders.
    await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
    if (level) {
      await prisma.inventoryLevel.update({
        where: { id: level.id },
        data: { quantity: level.quantity, reservedQuantity: level.reservedQuantity },
      });
    } else {
      await prisma.inventoryLevel.deleteMany({ where: { variantId, locationId } });
    }
    // Numbers taken by the test are given back, so the real series stays unbroken.
    await prisma.invoiceSequence.deleteMany({ where: { financialYear: { notIn: invoiceSeqs.map((s) => s.financialYear) } } });
    for (const s of invoiceSeqs) {
      await prisma.invoiceSequence.update({ where: { financialYear: s.financialYear }, data: { lastNumber: s.lastNumber } });
    }
    await prisma.creditNoteSequence.deleteMany({ where: { financialYear: { notIn: noteSeqs.map((s) => s.financialYear) } } });
    for (const s of noteSeqs) {
      await prisma.creditNoteSequence.update({ where: { financialYear: s.financialYear }, data: { lastNumber: s.lastNumber } });
    }
  }

  const { passed, failed } = results();
  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(isDomainError(error) ? `${error.code}: ${error.message}` : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
