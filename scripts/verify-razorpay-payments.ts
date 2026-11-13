/**
 * Verifies the Razorpay payment paths: signatures, the checkout order, the
 * webhook, and a second payment for an order that is already paid.
 *
 *     npx tsx scripts/verify-razorpay-payments.ts
 *
 * Local database only. Every row it writes is removed again, and the test
 * variant's stock and the invoice counters are put back as they were. The
 * checkout-order section makes one real call to the Razorpay TEST API (a test
 * order, which moves no money); it is skipped when no credentials are set.
 */
// Must come first: populates process.env before anything reads it.
import "./load-env";
import crypto from "crypto";
import { assertLocalDatabase } from "../prisma/guard-destructive";
import { prisma } from "../src/lib/prisma";
import { catalogService } from "../src/modules/catalog";
import { checkoutService, settleGatewayPayment } from "../src/modules/ecommerce";
import { inventoryService } from "../src/modules/inventory";
import { isDomainError } from "../src/modules/_shared/errors";
import { OrderId, VariantId } from "../src/modules/_shared/ids";
import {
  isValidCheckoutSignature,
  isValidWebhookSignature,
  razorpayCredentials,
} from "../src/modules/payments/razorpay/config";
import { createCheckoutOrder } from "../src/modules/payments/razorpay/checkout-order";
import { readGatewayFailure } from "../src/modules/payments/razorpay/gateway-error";
import { describeInstrument } from "../src/modules/payments/razorpay/payment-details";
import { handleWebhookEvent } from "../src/modules/payments/razorpay/webhook-events";
import { checkPosQr, closePosQr, createPosQr, verifyPosQrPayment } from "../src/modules/payments/razorpay/pos-qr";
import { posService } from "../src/modules/pos";
import { check, errorCode, results } from "./verify-helpers";

const STOCK = 5;
const hmac = (secret: string, payload: string) => crypto.createHmac("sha256", secret).update(payload).digest("hex");

function signaturesAndConfig(): void {
  console.log("Credentials: either spelling is read, Razorpay's own names first");
  const saved = { ...process.env };
  for (const key of ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET", "RAZORPAY_API_KEY", "RAZORPAY_SECRET"]) delete process.env[key];
  check("nothing set reads as not configured", razorpayCredentials(), null);
  process.env.RAZORPAY_API_KEY = " rzp_test_alt ";
  process.env.RAZORPAY_SECRET = "alt-secret";
  check("the API_KEY spelling works, trimmed", razorpayCredentials(), { keyId: "rzp_test_alt", keySecret: "alt-secret" });
  process.env.RAZORPAY_KEY_ID = "rzp_test_main";
  process.env.RAZORPAY_KEY_SECRET = "main-secret";
  check("KEY_ID wins when both are set", razorpayCredentials()?.keyId, "rzp_test_main");

  console.log("Checkout signature");
  const good = hmac("main-secret", "order_1|pay_1");
  check("valid signature accepted", isValidCheckoutSignature("order_1", "pay_1", good), true);
  check("another payment id rejected", isValidCheckoutSignature("order_1", "pay_2", good), false);
  check("another order id rejected", isValidCheckoutSignature("order_2", "pay_1", good), false);
  check("empty signature rejected", isValidCheckoutSignature("order_1", "pay_1", ""), false);
  check("short signature rejected without throwing", isValidCheckoutSignature("order_1", "pay_1", good.slice(0, 10)), false);

  console.log("Webhook signature");
  const body = JSON.stringify({ event: "payment.captured" });
  delete process.env.RAZORPAY_WEBHOOK_SECRET;
  check("refused when no webhook secret is set", isValidWebhookSignature(body, hmac("x", body)), false);
  process.env.RAZORPAY_WEBHOOK_SECRET = "whsec";
  check("valid body signature accepted", isValidWebhookSignature(body, hmac("whsec", body)), true);
  check("the API secret is not the webhook secret", isValidWebhookSignature(body, hmac("main-secret", body)), false);
  check("a tampered body is rejected", isValidWebhookSignature(body + " ", hmac("whsec", body)), false);
  check("a missing header is rejected", isValidWebhookSignature(body, null), false);

  console.log("Gateway errors and instruments");
  check("rejected credentials read as 401", readGatewayFailure({ statusCode: 401, error: { description: "Authentication failed" } }).status, 401);
  check("a feature not enabled is explained", readGatewayFailure({ statusCode: 400, error: { description: "The requested URL was not found on the server." } }).message.includes("not switched on"), true);
  check("an unknown failure is still an answer", readGatewayFailure(new Error("boom")).status, 502);
  check("UPI names the handle", describeInstrument({ method: "upi", vpa: "ananya@okicici" }).instrumentDetail, "ananya@okicici");

  for (const key of Object.keys(process.env)) if (!(key in saved)) delete process.env[key];
  Object.assign(process.env, saved);
  for (const key of ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET", "RAZORPAY_API_KEY", "RAZORPAY_SECRET", "RAZORPAY_WEBHOOK_SECRET"]) {
    if (saved[key] === undefined) delete process.env[key];
  }
}

async function main(): Promise<void> {
  assertLocalDatabase("scripts/verify-razorpay-payments.ts");
  signaturesAndConfig();

  const [variant] = await catalogService.searchVariants({ limit: 1, sellableOnly: true });
  if (!variant) throw new Error("No sellable variant to test against");
  const variantId = VariantId(variant.variantId);
  const locationId = await inventoryService.getDefaultLocationId();
  const level = await prisma.inventoryLevel.findUnique({ where: { variantId_locationId: { variantId, locationId } } });
  const invoiceSeqs = await prisma.invoiceSequence.findMany();
  const user = await prisma.user.findFirst({ select: { id: true } });
  const orderIds: string[] = [];
  const run = Date.now();

  const stock = async () => {
    const row = await prisma.inventoryLevel.findUnique({
      where: { variantId_locationId: { variantId, locationId } },
      select: { quantity: true, reservedQuantity: true },
    });
    return [row?.quantity, row?.reservedQuantity];
  };
  const state = (id: string) =>
    prisma.order.findUniqueOrThrow({
      where: { id },
      select: { status: true, paymentStatus: true, payment: { select: { errorCode: true, razorpayOrderId: true, razorpayPaymentId: true, metadata: true } } },
    });
  const onlineOrder = async (userId: string | null) =>
    prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          orderNumber: `VERIFY-RZP-${run}-${orderIds.length}`,
          userId,
          totalCents: variant.priceCents,
          paymentMethod: "razorpay",
          paymentStatus: "PENDING",
          status: "PENDING",
          items: { create: { variantId, quantity: 1, priceCents: variant.priceCents, name: "Verify" } },
          payment: { create: { amountCents: variant.priceCents, method: "razorpay", status: "PENDING" } },
        },
      });
      orderIds.push(created.id);
      await checkoutService.reserveForOrder(OrderId(created.id), [{ variantId, quantity: 1 }], tx);
      return created.id;
    });
  const captured = (orderId: string, gatewayOrderId: string, paymentId: string, amount: number) =>
    handleWebhookEvent({
      event: "payment.captured",
      payload: { payment: { entity: { id: paymentId, order_id: gatewayOrderId, amount, method: "upi", vpa: "ananya@okicici", notes: { orderId } } } },
    });

  try {
    await prisma.inventoryLevel.upsert({
      where: { variantId_locationId: { variantId, locationId } },
      create: { variantId, locationId, quantity: STOCK },
      update: { quantity: STOCK, reservedQuantity: 0 },
    });

    console.log("The webhook settles a payment the browser never reported");
    const a = await onlineOrder(null);
    await prisma.payment.update({ where: { orderId: a }, data: { razorpayOrderId: `order_wh_${run}_a` } });
    check("settled by the webhook alone", await captured(a, `order_wh_${run}_a`, `pay_wh_${run}_a`, variant.priceCents), "settled");
    let s = await state(a);
    check("order paid and processing", [s.status, s.paymentStatus], ["PROCESSING", "COMPLETED"]);
    check("instrument captured from the event", (await prisma.payment.findUniqueOrThrow({ where: { orderId: a } })).payerVpa, "ananya@okicici");
    check("hold became a sale", await stock(), [STOCK - 1, 0]);
    check("invoice raised", await prisma.invoice.count({ where: { orderId: a } }), 1);
    check("the same event again changes nothing", await captured(a, `order_wh_${run}_a`, `pay_wh_${run}_a`, variant.priceCents), "ignored");
    check("stock taken once", await stock(), [STOCK - 1, 0]);

    console.log("A second, different payment for an order already paid");
    check("settles as a duplicate", await settleGatewayPayment({ orderId: a, razorpayPaymentId: `pay_wh_${run}_dup`, instrument: {} }), "DUPLICATE");
    s = await state(a);
    check("order untouched, first payment kept", [s.status, s.payment?.razorpayPaymentId], ["PROCESSING", `pay_wh_${run}_a`]);
    check("the extra payment is noted", (s.payment?.metadata as { duplicatePayments?: unknown[] })?.duplicatePayments?.length, 1);
    check("noted once even if repeated", (await settleGatewayPayment({ orderId: a, razorpayPaymentId: `pay_wh_${run}_dup`, instrument: {} }), (await state(a)).payment?.metadata as { duplicatePayments?: unknown[] }).duplicatePayments?.length, 1);
    check("stock still taken once", await stock(), [STOCK - 1, 0]);
    check("still one invoice", await prisma.invoice.count({ where: { orderId: a } }), 1);

    console.log("A payment for the wrong amount is flagged, not accepted");
    const b = await onlineOrder(null);
    await prisma.payment.update({ where: { orderId: b }, data: { razorpayOrderId: `order_wh_${run}_b` } });
    check("recorded for staff", await captured(b, `order_wh_${run}_b`, `pay_wh_${run}_b`, variant.priceCents - 1), "recorded");
    s = await state(b);
    check("order left unpaid with the reason", [s.status, s.paymentStatus, s.payment?.errorCode], ["PENDING", "PENDING", "AMOUNT_MISMATCH"]);

    console.log("Events for orders we do not know, and failures");
    check("unknown gateway order ignored", await captured("none", "order_unknown", "pay_x", 100), "ignored");
    check("unrelated event ignored", await handleWebhookEvent({ event: "refund.created", payload: {} }), "ignored");
    check("a failed attempt is recorded", await handleWebhookEvent({ event: "payment.failed", payload: { payment: { entity: { id: "pay_f", order_id: `order_wh_${run}_b`, error_code: "BAD_REQUEST_ERROR", error_description: "Card declined" } } } }), "recorded");
    s = await state(b);
    check("the order stays open after a decline", [s.status, s.paymentStatus, s.payment?.errorCode], ["PENDING", "PENDING", "BAD_REQUEST_ERROR"]);
    check("a later good payment clears the error", (await captured(b, `order_wh_${run}_b`, `pay_wh_${run}_b2`, variant.priceCents), (await state(b)).payment?.errorCode), null);

    console.log("The counter QR: the gateway's word, not the cashier's");
    interface FakePayment { id: string; status: string; amount: number; method?: string; vpa?: string; acquirer_data?: { rrn?: string } }
    const closed: string[] = [];
    let createdWith: Record<string, unknown> | undefined;
    const fakeQr = (options: { amount: number; payments: FakePayment[]; channel?: string; status?: string }) =>
      ({
        create: async (params: Record<string, unknown>) => ((createdWith = params), { id: "qr_fake", image_url: "https://example.test/qr.png" }),
        fetch: async () => ({ id: "qr_fake", status: options.status ?? "active", payment_amount: options.amount, notes: { channel: options.channel ?? "POS" } }),
        fetchAllPayments: async () => ({ items: options.payments }),
        close: async (id: string) => (closed.push(id), {}),
      }) as never;
    const upi = (id: string, amount: number, status = "captured"): FakePayment => ({ id, status, amount, method: "upi", vpa: "ananya@okicici", acquirer_data: { rrn: "412345678901" } });
    const price = variant.priceCents;

    check("a QR below the gateway minimum is refused", await errorCode(() => createPosQr(50, "POS-1", fakeQr({ amount: 50, payments: [] }))), "VALIDATION_FAILED");
    const made = await createPosQr(price, "POS-ABC", fakeQr({ amount: price, payments: [] }));
    check("returns the QR and its image", [made.qrId, made.imageUrl], ["qr_fake", "https://example.test/qr.png"]);
    check("fixed amount, single use, marked as a counter QR", [createdWith?.fixed_amount, createdWith?.usage, createdWith?.payment_amount, (createdWith?.notes as { channel?: string })?.channel], [true, "single_use", price, "POS"]);
    check("unpaid reads as waiting", await checkPosQr("qr_fake", fakeQr({ amount: price, payments: [] })), { state: "WAITING" });
    check("a closed unpaid QR reads as closed", await checkPosQr("qr_fake", fakeQr({ amount: price, payments: [], status: "closed" })), { state: "CLOSED" });
    check("a failed payment is not payment", (await checkPosQr("qr_fake", fakeQr({ amount: price, payments: [upi("pay_q0", price, "failed")] }))).state, "WAITING");
    check("a different amount is not payment", (await checkPosQr("qr_fake", fakeQr({ amount: price, payments: [upi("pay_q0", price - 1)] }))).state, "WAITING");
    const paidQr = fakeQr({ amount: price, payments: [upi(`pay_q_${run}`, price)] });
    check("paid carries the payer and the bank reference", await checkPosQr("qr_fake", paidQr), { state: "PAID", gatewayPaymentId: `pay_q_${run}`, amountCents: price, payerVpa: "ananya@okicici", utr: "412345678901" });
    check("an order's QR cannot pay for a counter sale", await errorCode(() => checkPosQr("qr_fake", fakeQr({ amount: price, payments: [upi("pay_q1", price)], channel: "ORDER" }))), "NOT_FOUND");
    check("unpaid cannot be verified", await errorCode(() => verifyPosQrPayment("qr_fake", price, fakeQr({ amount: price, payments: [] }))), "PAYMENT_NOT_VERIFIED");
    check("a sale for a different total cannot use it", await errorCode(() => verifyPosQrPayment("qr_fake", price + 100, paidQr)), "PAYMENT_NOT_VERIFIED");
    await closePosQr("qr_fake", fakeQr({ amount: price, payments: [] }));
    await closePosQr("qr_other", fakeQr({ amount: price, payments: [], channel: "ORDER" }));
    check("only a counter QR is closed", closed, ["qr_fake"]);

    const verified = await verifyPosQrPayment("qr_fake", price, paidQr);
    check("verified for the right amount", verified, { gatewayPaymentId: `pay_q_${run}`, payerVpa: "ananya@okicici", utr: "412345678901" });
    const sale = await posService.completeSale({
      lines: [{ variantId, quantity: 1 }],
      payment: { method: "UPI", reference: verified.gatewayPaymentId, payerVpa: verified.payerVpa ?? undefined, utr: verified.utr ?? undefined, gatewayPaymentId: verified.gatewayPaymentId },
      actorId: "verify",
    });
    orderIds.push(sale.orderId);
    const saved = await prisma.payment.findUniqueOrThrow({ where: { orderId: sale.orderId } });
    check("the sale records who paid and the bank reference", [saved.status, saved.method, saved.payerVpa, saved.utr, saved.razorpayPaymentId], ["COMPLETED", "UPI", "ananya@okicici", "412345678901", `pay_q_${run}`]);
    check("the same payment cannot pay for a second sale", await errorCode(() => verifyPosQrPayment("qr_fake", price, paidQr)), "CONFLICT");

    if (razorpayCredentials() && user) {
      console.log("The checkout order: amount comes from the server, ownership is enforced (Razorpay TEST API)");
      const c = await onlineOrder(user.id);
      check("someone else's order is not found", await errorCode(() => createCheckoutOrder(c, "not-the-owner")), "ORDER_NOT_FOUND");
      const first = await createCheckoutOrder(c, user.id);
      check("amount is the order's own", first.amountCents, variant.priceCents);
      check("a real gateway order id", first.razorpayOrderId.startsWith("order_"), true);
      check("stored against the payment", (await state(c)).payment?.razorpayOrderId, first.razorpayOrderId);
      check("a retry reuses it", (await createCheckoutOrder(c, user.id)).razorpayOrderId, first.razorpayOrderId);
      await prisma.order.update({ where: { id: c }, data: { status: "CANCELLED" } });
      check("a closed order cannot be paid", await errorCode(() => createCheckoutOrder(c, user.id)), "CONFLICT");
    } else {
      console.log("Skipped the checkout-order section: no Razorpay credentials or no user");
    }
  } finally {
    await prisma.inventoryMovement.deleteMany({ where: { referenceType: "ORDER", referenceId: { in: orderIds } } });
    await prisma.inventoryReservation.deleteMany({ where: { referenceType: "ORDER", referenceId: { in: orderIds } } });
    await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
    if (level) {
      await prisma.inventoryLevel.update({ where: { id: level.id }, data: { quantity: level.quantity, reservedQuantity: level.reservedQuantity } });
    } else {
      await prisma.inventoryLevel.deleteMany({ where: { variantId, locationId } });
    }
    await prisma.invoiceSequence.deleteMany({ where: { financialYear: { notIn: invoiceSeqs.map((x) => x.financialYear) } } });
    for (const x of invoiceSeqs) {
      await prisma.invoiceSequence.update({ where: { financialYear: x.financialYear }, data: { lastNumber: x.lastNumber } });
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
