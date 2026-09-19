/**
 * Writes the full demo dataset in ONE pass.
 *
 * Clears whatever dummy catalog rows are left, then populates every table the
 * admin and storefront read from: customers with addresses, orders across all
 * statuses with payments and tracking, wishlists, engagement events,
 * discounts, newsletter signups and audit entries.
 *
 * Stock is consumed through the real Inventory service rather than by writing
 * numbers directly, so the ledger, the levels and the orders all agree — the
 * demo data exercises the same path a live sale would.
 *
 *     npx tsx scripts/seed-demo.ts
 */
// Must come first: populates process.env before anything reads it.
import "./load-env";
import { assertLocalDatabase } from "../prisma/guard-destructive";
import { prisma } from "../src/lib/prisma";
import { inventoryService } from "../src/modules/inventory";
import { VariantId } from "../src/modules/_shared/ids";
import bcrypt from "bcryptjs";
import {
  DEMO_CUSTOMERS,
  DEMO_DISCOUNTS,
  DEMO_NEWSLETTER,
  DEMO_ORDERS,
  DEMO_PASSWORD,
} from "./demo-data";

const GST_RATE_BPS = 300; // 3% on jewellery
const SHIPPING_CENTS = 9900;

function orderNumber(placedAt: Date, index: number): string {
  const stamp = placedAt.toISOString().slice(0, 10).replace(/-/g, "");
  return `LVI-${stamp}-${String(index + 1).padStart(4, "0")}`;
}

async function main(): Promise<void> {
  assertLocalDatabase("scripts/seed-demo.ts");

  const locationId = await inventoryService.getDefaultLocationId();
  const password = await bcrypt.hash(DEMO_PASSWORD, 10);

  // ---- Clear what is left of the old dummy catalog ------------------------
  const stale = await prisma.product.findMany({
    where: { isPublished: false },
    select: { id: true },
  });
  if (stale.length > 0) {
    const staleIds = stale.map((p) => p.id);
    await prisma.order.deleteMany({
      where: { items: { some: { productId: { in: staleIds } } } },
    });
    await prisma.product.deleteMany({ where: { id: { in: staleIds } } });
    console.log(`Cleared ${stale.length} leftover dummy product(s) and their orders.`);
  }
  // Start the order history clean so the demo set is the whole picture.
  await prisma.order.deleteMany({});

  // ---- Customers and addresses -------------------------------------------
  const customerIds: string[] = [];
  const addressIds: string[] = [];

  for (const customer of DEMO_CUSTOMERS) {
    const user = await prisma.user.upsert({
      where: { email: customer.email },
      update: { name: customer.name, mobile: customer.mobile },
      create: {
        email: customer.email,
        username: customer.username,
        name: customer.name,
        mobile: customer.mobile,
        password,
        role: "CUSTOMER",
      },
      select: { id: true },
    });
    customerIds.push(user.id);

    const existing = await prisma.address.findFirst({
      where: { userId: user.id },
      select: { id: true },
    });
    const address =
      existing ??
      (await prisma.address.create({
        data: {
          userId: user.id,
          fullName: customer.name,
          mobile: customer.mobile,
          addressLine1: customer.address.addressLine1,
          addressLine2: customer.address.addressLine2 ?? null,
          city: customer.address.city,
          state: customer.address.state,
          pincode: customer.address.pincode,
          isDefault: true,
        },
        select: { id: true },
      }));
    addressIds.push(address.id);

    // A login or two each, so the account activity page is not empty.
    await prisma.loginEvent.createMany({
      data: [
        {
          userId: user.id,
          browser: "Chrome",
          os: "Windows",
          deviceType: "Desktop",
          city: customer.address.city,
          country: "India",
        },
        {
          userId: user.id,
          browser: "Safari",
          os: "iOS",
          deviceType: "Mobile",
          city: customer.address.city,
          country: "India",
        },
      ],
    });
  }
  console.log(`${customerIds.length} customers with addresses and login history.`);

  // ---- Discounts ----------------------------------------------------------
  const now = new Date();
  const yearEnd = new Date(now.getFullYear() + 1, 2, 31);
  for (const discount of DEMO_DISCOUNTS) {
    await prisma.discount.upsert({
      where: { code: discount.code },
      update: {},
      create: {
        ...discount,
        startDate: new Date(now.getFullYear(), 0, 1),
        endDate: yearEnd,
        isActive: true,
      },
    });
  }

  // ---- Products to sell from ---------------------------------------------
  const products = await prisma.product.findMany({
    where: { isPublished: true },
    select: {
      id: true,
      slug: true,
      name: true,
      priceCents: true,
      images: { where: { isPrimary: true }, take: 1, select: { url: true } },
      variants: {
        where: { isActive: true },
        orderBy: { position: "asc" },
        select: { id: true, name: true, sku: true, barcode: true, priceCents: true },
      },
    },
  });
  const bySlug = new Map(products.map((p) => [p.slug, p]));

  // ---- Orders -------------------------------------------------------------
  let ordersCreated = 0;

  for (const [index, spec] of DEMO_ORDERS.entries()) {
    const placedAt = new Date(now.getTime() - spec.daysAgo * 86_400_000);

    const lines = spec.lines
      .map((line) => {
        const product = bySlug.get(line.slug);
        if (!product || product.variants.length === 0) return null;
        const variant = product.variants[0];
        const unitPrice = variant.priceCents ?? product.priceCents;
        return { product, variant, quantity: line.quantity, unitPrice };
      })
      .filter((l): l is NonNullable<typeof l> => l !== null);

    if (lines.length === 0) continue;

    const subtotal = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
    const discount = spec.discountCode === "WELCOME10" ? Math.round(subtotal * 0.1) : 0;
    const tax = Math.round(((subtotal - discount) * GST_RATE_BPS) / 10_000);
    const total = subtotal - discount + tax + SHIPPING_CENTS;

    await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          userId: customerIds[spec.customer],
          addressId: addressIds[spec.customer],
          orderNumber: orderNumber(placedAt, index),
          source: "ONLINE",
          totalCents: subtotal,
          shippingCents: SHIPPING_CENTS,
          taxCents: tax,
          discountCents: discount,
          discountCode: spec.discountCode ?? null,
          status: spec.status,
          paymentStatus: spec.paymentStatus,
          paymentMethod: spec.paymentMethod,
          paymentProvider: spec.paymentMethod === "razorpay" ? "razorpay" : null,
          customerName: DEMO_CUSTOMERS[spec.customer].name,
          customerMobile: DEMO_CUSTOMERS[spec.customer].mobile,
          createdAt: placedAt,
        },
        select: { id: true },
      });

      // Every line freezes what it was sold as, so an invoice never depends
      // on the catalog's current state.
      await tx.orderItem.createMany({
        data: lines.map((l) => ({
          orderId: order.id,
          productId: l.product.id,
          variantId: l.variant.id,
          quantity: l.quantity,
          priceCents: l.unitPrice,
          catalogPriceCents: l.product.priceCents,
          name: l.product.name,
          variantName: l.variant.name,
          sku: l.variant.sku,
          barcode: l.variant.barcode,
          image: l.product.images[0]?.url ?? null,
          taxRateBps: GST_RATE_BPS,
          taxCents: Math.round((l.unitPrice * l.quantity * GST_RATE_BPS) / 10_000),
        })),
      });

      await tx.payment.create({
        data: {
          orderId: order.id,
          amountCents: total,
          currency: "INR",
          method: spec.paymentMethod,
          status: spec.paymentStatus,
          reference:
            spec.paymentStatus === "COMPLETED" && spec.paymentMethod === "razorpay"
              ? `pay_demo${String(index).padStart(6, "0")}`
              : null,
          createdAt: placedAt,
        },
      });

      const trail = ["Order placed"];
      if (spec.paymentStatus === "COMPLETED") trail.push("Payment confirmed");
      if (["PROCESSING", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"].includes(spec.status))
        trail.push("Processing");
      if (["SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"].includes(spec.status)) trail.push("Shipped");
      if (["OUT_FOR_DELIVERY", "DELIVERED"].includes(spec.status)) trail.push("Out for delivery");
      if (spec.status === "DELIVERED") trail.push("Delivered");
      if (spec.status === "CANCELLED") trail.push("Cancelled");

      await tx.orderTracking.createMany({
        data: trail.map((status, step) => ({
          orderId: order.id,
          status,
          updatedBy: "system",
          createdAt: new Date(placedAt.getTime() + step * 86_400_000),
        })),
      });

      // Stock moves through the real service, so levels and ledger agree.
      const stockLines = lines.map((l) => ({
        variantId: VariantId(l.variant.id),
        quantity: l.quantity,
      }));

      if (spec.status !== "PENDING") {
        await inventoryService.commitSale(
          stockLines,
          { locationId, referenceId: order.id, actorId: "system" },
          tx,
        );
        // A cancelled order gives its stock back, leaving both movements on
        // the ledger exactly as a real cancellation would.
        if (spec.status === "CANCELLED") {
          await inventoryService.returnStock(
            stockLines,
            { locationId, referenceId: order.id, reason: "Order cancelled", actorId: "system" },
            tx,
          );
        }
      }
    });

    ordersCreated++;
  }
  console.log(`${ordersCreated} orders with payments, tracking and stock movements.`);

  // ---- Wishlists, engagement, newsletter, audit ---------------------------
  for (const [index, userId] of customerIds.entries()) {
    const product = products[index % products.length];
    await prisma.wishlistItem.upsert({
      where: { userId_productId: { userId, productId: product.id } },
      update: {},
      create: { userId, productId: product.id },
    });
  }

  // Engagement, so Analytics > Product Engagement has a real shape.
  const events = products.flatMap((product, i) =>
    Array.from({ length: 6 + i * 2 }, (_, n) => ({
      productId: product.id,
      type: n % 4 === 0 ? ("ADD_TO_CART" as const) : ("VIEW" as const),
      sessionId: `demo-session-${i}-${n}`,
      durationMs: n % 4 === 0 ? null : 4000 + n * 900,
      createdAt: new Date(now.getTime() - (n % 20) * 86_400_000),
    })),
  );
  await prisma.productEvent.createMany({ data: events });

  for (const email of DEMO_NEWSLETTER) {
    await prisma.newsletterSubscriber.upsert({ where: { email }, update: {}, create: { email } });
  }

  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" }, select: { id: true, name: true } });
  if (admin) {
    await prisma.auditLog.createMany({
      data: products.map((product) => ({
        adminId: admin.id,
        adminName: admin.name,
        action: "PUBLISH",
        entity: "Product",
        entityId: product.id,
        metadata: { productName: product.name },
      })),
    });
  }

  const [orders, levels, movements] = await Promise.all([
    prisma.order.count(),
    prisma.inventoryLevel.aggregate({ _sum: { quantity: true } }),
    prisma.inventoryMovement.count(),
  ]);
  console.log(
    `\n${events.length} engagement events · ${DEMO_NEWSLETTER.length} subscribers\n` +
      `${orders} orders · ${levels._sum.quantity ?? 0} units on hand · ${movements} ledger movements\n`,
  );
}

main()
  .catch((error) => {
    console.error("\nDemo seeding failed:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
