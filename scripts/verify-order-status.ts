/**
 * Verifies what follows an order's status: stock back on the shelf (once
 * only) on cancel or refund, taken again on reinstatement, the payment status
 * and the cash-on-delivery invoice.
 *
 *     npx tsx scripts/verify-order-status.ts
 *
 * Local database only. Every row it writes is removed again and the test
 * variant's stock and the invoice counter are put back as they were.
 */
// Must come first: populates process.env before anything reads it.
import "./load-env";
import { assertLocalDatabase } from "../prisma/guard-destructive";
import { prisma } from "../src/lib/prisma";
import { catalogService } from "../src/modules/catalog";
import { checkoutService } from "../src/modules/ecommerce";
import { inventoryService } from "../src/modules/inventory";
import { changeOrderStatus, orderService } from "../src/modules/orders";
import { isDomainError } from "../src/modules/_shared/errors";
import { OrderId, VariantId } from "../src/modules/_shared/ids";
import type { OrderStatus } from "@prisma/client";

let passed = 0;
let failed = 0;

function check(label: string, actual: unknown, expected: unknown): void {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) passed++;
  else failed++;
  console.log(
    ok
      ? `  PASS  ${label}`
      : `  FAIL  ${label}\n          expected ${JSON.stringify(expected)}\n          actual   ${JSON.stringify(actual)}`,
  );
}

const STOCK = 5;
const COD_FEE = 5_000;

async function main(): Promise<void> {
  assertLocalDatabase("scripts/verify-order-status.ts");

  const [variant] = await catalogService.searchVariants({ limit: 1, sellableOnly: true });
  if (!variant) throw new Error("No sellable variant to test against");
  const variantId = VariantId(variant.variantId);
  const locationId = await inventoryService.getDefaultLocationId();
  const level = await prisma.inventoryLevel.findUnique({
    where: { variantId_locationId: { variantId, locationId } },
  });
  const sequences = await prisma.invoiceSequence.findMany();
  const orderIds: string[] = [];

  const stock = async () => {
    const row = await prisma.inventoryLevel.findUnique({
      where: { variantId_locationId: { variantId, locationId } },
      select: { quantity: true, reservedQuantity: true },
    });
    return [row?.quantity, row?.reservedQuantity];
  };
  const order = (id: string) =>
    prisma.order.findUniqueOrThrow({
      where: { id },
      select: { status: true, paymentStatus: true, payment: { select: { status: true } } },
    });
  const movements = (id: string, type: "SALE" | "RETURN" | "RELEASE") =>
    prisma.inventoryMovement.count({ where: { referenceType: "ORDER", referenceId: id, type } });
  const move = (id: string, status: OrderStatus) =>
    prisma.$transaction((tx) => changeOrderStatus(tx, id, status, "verify"), { timeout: 20_000 });

  // An online order as api/orders/create writes it: held, then settled at
  // once for cash on delivery, left held for a gateway payment.
  const onlineOrder = async (method: "cod" | "razorpay") =>
    prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          orderNumber: `VERIFY-${method}-${Date.now()}`,
          totalCents: variant.priceCents,
          codFeeCents: method === "cod" ? COD_FEE : 0,
          paymentMethod: method,
          paymentStatus: "PENDING",
          status: method === "cod" ? "PROCESSING" : "PENDING",
          items: {
            create: { variantId, quantity: 1, priceCents: variant.priceCents, name: "Verify" },
          },
          payment: {
            create: {
              amountCents: variant.priceCents,
              method,
              status: method === "cod" ? "COMPLETED" : "PENDING",
            },
          },
        },
      });
      orderIds.push(created.id);
      const lines = [{ variantId, quantity: 1 }];
      await checkoutService.reserveForOrder(OrderId(created.id), lines, tx);
      if (method === "cod") await checkoutService.commitPaidOrder(OrderId(created.id), lines, tx);
      return created.id;
    });

  try {
    await prisma.inventoryLevel.upsert({
      where: { variantId_locationId: { variantId, locationId } },
      create: { variantId, locationId, quantity: STOCK },
      update: { quantity: STOCK, reservedQuantity: 0 },
    });

    console.log("Cash on delivery: dispatch, deliver, refund, cancel");
    const cod = await onlineOrder("cod");
    check("COD order takes the piece", await stock(), [STOCK - 1, 0]);
    await move(cod, "SHIPPED");
    await move(cod, "SHIPPED");
    const invoices = await prisma.invoice.findMany({ where: { orderId: cod } });
    check("one invoice raised on dispatch", invoices.length, 1);
    check("invoice total includes the COD fee", invoices[0]?.totalCents, variant.priceCents + COD_FEE);
    check("still unpaid while out", (await order(cod)).paymentStatus, "PENDING");
    await move(cod, "DELIVERED");
    check("delivered COD is paid", await order(cod), {
      status: "DELIVERED", paymentStatus: "COMPLETED", payment: { status: "COMPLETED" },
    });
    check("still one invoice", await prisma.invoice.count({ where: { orderId: cod } }), 1);
    await move(cod, "REFUNDED");
    check("refund puts the piece back", await stock(), [STOCK, 0]);
    check("refund marks the payment refunded", (await order(cod)).paymentStatus, "REFUNDED");
    await move(cod, "CANCELLED");
    check("cancel after refund returns nothing more", await stock(), [STOCK, 0]);
    check("exactly one RETURN movement", await movements(cod, "RETURN"), 1);

    console.log("Two people cancelling at the same moment");
    const raced = await onlineOrder("cod");
    await Promise.all([move(raced, "CANCELLED"), move(raced, "REFUNDED")]);
    check("piece returned once", await stock(), [STOCK, 0]);
    check("one RETURN movement", await movements(raced, "RETURN"), 1);

    console.log("Gateway order cancelled before payment");
    const pending = await onlineOrder("razorpay");
    check("hold placed", await stock(), [STOCK, 1]);
    await move(pending, "CANCELLED");
    await move(pending, "CANCELLED");
    check("hold released, nothing returned", await stock(), [STOCK, 0]);
    check("no RETURN for stock never sold", await movements(pending, "RETURN"), 0);
    check("one RELEASE", await movements(pending, "RELEASE"), 1);
    check("unpaid cancel marks payment failed", await order(pending), {
      status: "CANCELLED", paymentStatus: "FAILED", payment: { status: "FAILED" },
    });
    await move(pending, "PENDING");
    check("reinstated unpaid order is owed again", (await order(pending)).paymentStatus, "PENDING");
    check("never-sold order takes no stock back", await movements(pending, "SALE"), 0);

    console.log("Counter sale cancelled, reinstated, cancelled");
    const store = await orderService.createOrder({
      source: "STORE",
      lines: [{ variantId, quantity: 2 }],
      payment: { method: "CASH", status: "COMPLETED" },
      actorId: "verify",
    });
    orderIds.push(store.orderId);
    check("sale takes two", await stock(), [STOCK - 2, 0]);
    await move(store.orderId, "CANCELLED");
    check("cancel returns two", await stock(), [STOCK, 0]);
    check("paid cancel keeps payment until refunded", (await order(store.orderId)).paymentStatus, "COMPLETED");
    await move(store.orderId, "DELIVERED");
    check("reinstated sale takes two again", await stock(), [STOCK - 2, 0]);
    await move(store.orderId, "CANCELLED");
    check("second cancel returns two again", await stock(), [STOCK, 0]);
    check("two RETURN movements", await movements(store.orderId, "RETURN"), 2);
    check("no invoice for a counter sale changing status", await prisma.invoice.count({ where: { orderId: store.orderId } }), 0);

    console.log("Reinstating when the pieces have since sold");
    await prisma.inventoryLevel.update({
      where: { variantId_locationId: { variantId, locationId } },
      data: { quantity: 1 },
    });
    let code: string | null = null;
    try {
      await move(store.orderId, "DELIVERED");
    } catch (error) {
      code = isDomainError(error) ? error.code : String(error);
    }
    check("refused for insufficient stock", code, "INSUFFICIENT_STOCK");
    check("order left cancelled", (await order(store.orderId)).status, "CANCELLED");
  } finally {
    await prisma.inventoryMovement.deleteMany({
      where: { referenceType: "ORDER", referenceId: { in: orderIds } },
    });
    await prisma.inventoryReservation.deleteMany({
      where: { referenceType: "ORDER", referenceId: { in: orderIds } },
    });
    await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
    if (level) {
      await prisma.inventoryLevel.update({
        where: { id: level.id },
        data: { quantity: level.quantity, reservedQuantity: level.reservedQuantity },
      });
    } else {
      await prisma.inventoryLevel.deleteMany({ where: { variantId, locationId } });
    }
    // Invoice numbers taken by the test are given back.
    await prisma.invoiceSequence.deleteMany({
      where: { financialYear: { notIn: sequences.map((s) => s.financialYear) } },
    });
    for (const s of sequences) {
      await prisma.invoiceSequence.update({
        where: { financialYear: s.financialYear },
        data: { lastNumber: s.lastNumber },
      });
    }
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
