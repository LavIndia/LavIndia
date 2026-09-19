/**
 * Verifies a counter sale end to end: order, stock and invoice.
 *
 * Covers the scenarios from the brief that touch POS — price override leaving
 * the catalog untouched, an invoice number that is sequential rather than
 * derived from the order, and the whole thing rolling back together when
 * stock runs out.
 *
 *     npx tsx scripts/verify-pos.ts
 */
// Must come first: populates process.env before anything reads it.
import "./load-env";
import { assertLocalDatabase } from "../prisma/guard-destructive";
import { prisma } from "../src/lib/prisma";
import { posService } from "../src/modules/pos";
import { catalogService } from "../src/modules/catalog";
import { inventoryService } from "../src/modules/inventory";
import { financialYearFor } from "../src/modules/billing";
import { isDomainError } from "../src/modules/_shared/errors";
import { VariantId } from "../src/modules/_shared/ids";

let passed = 0;
let failed = 0;

function check(label: string, actual: unknown, expected: unknown): void {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) {
    passed++;
    console.log(`  PASS  ${label}`);
  } else {
    failed++;
    console.log(`  FAIL  ${label}\n          expected ${JSON.stringify(expected)}\n          actual   ${JSON.stringify(actual)}`);
  }
}

async function main(): Promise<void> {
  assertLocalDatabase("scripts/verify-pos.ts");

  const [variant] = await catalogService.searchVariants({ limit: 1, sellableOnly: true });
  if (!variant) throw new Error("No sellable variant to test against");

  const variantId = VariantId(variant.variantId);
  const admin = await prisma.user.findFirstOrThrow({ where: { role: "ADMIN" }, select: { id: true } });
  const locationId = await inventoryService.getDefaultLocationId();
  const before = (await inventoryService.getLevels([variantId])).get(variantId)!.quantity;

  console.log(`\nSelling: ${variant.productName} / ${variant.variantName}`);
  console.log(`Catalog price Rs ${(variant.priceCents / 100).toLocaleString("en-IN")} · stock ${before}\n`);

  const createdOrderIds: string[] = [];

  try {
    // --- A plain counter sale --------------------------------------------
    console.log("Scenario: a counter sale");
    const sale = await posService.completeSale({
      lines: [{ variantId, quantity: 1 }],
      payment: { method: "CASH" },
      actorId: admin.id,
    });
    createdOrderIds.push(sale.orderId);

    const order = await prisma.order.findUniqueOrThrow({
      where: { id: sale.orderId },
      include: { items: true, payment: true },
    });
    check("order source is STORE", order.source, "STORE");
    check("paid and settled immediately", [order.paymentStatus, order.status], ["COMPLETED", "DELIVERED"]);
    check("walk-in sale needs no account", order.userId, null);
    check("stock fell by one", (await inventoryService.getLevels([variantId])).get(variantId)!.quantity, before - 1);

    const saleMovement = await prisma.inventoryMovement.findFirst({
      where: { referenceType: "ORDER", referenceId: sale.orderId, type: "SALE" },
    });
    check("a SALE movement references the order", Boolean(saleMovement), true);

    check("an invoice was issued", Boolean(sale.invoiceNumber), true);
    check(
      "invoice number is NOT the order number",
      sale.invoiceNumber === sale.orderNumber,
      false,
    );
    check(
      "invoice number carries the financial year",
      sale.invoiceNumber.includes(financialYearFor(new Date())),
      true,
    );
    check("invoice snapshot names the line", sale.invoice.lines[0].description, variant.productName);
    check("invoice carries a greeting", sale.invoice.greeting.length > 0, true);

    // --- Price override ----------------------------------------------------
    console.log("\nScenario: an authorised price override");
    const discounted = Math.max(100, variant.priceCents - 50000);
    const overrideSale = await posService.completeSale({
      lines: [
        {
          variantId,
          quantity: 1,
          overridePriceCents: discounted,
          overrideReason: "Long-standing customer",
        },
      ],
      payment: { method: "UPI", reference: "UPI-TEST-0001" },
      actorId: admin.id,
    });
    createdOrderIds.push(overrideSale.orderId);

    const overrideItem = await prisma.orderItem.findFirstOrThrow({
      where: { orderId: overrideSale.orderId },
    });
    check("charged the overridden price", overrideItem.priceCents, discounted);
    check("catalog price is still recorded", overrideItem.catalogPriceCents, variant.priceCents);
    check("the difference shows as a discount", overrideItem.discountCents, variant.priceCents - discounted);
    check("the reason is kept", overrideItem.overrideReason, "Long-standing customer");

    const catalogAfter = await catalogService.findVariantById(variantId);
    check("CATALOG PRICE IS UNCHANGED", catalogAfter?.priceCents, variant.priceCents);

    // --- Invoice numbering -------------------------------------------------
    console.log("\nScenario: invoice numbers run in sequence");
    const invoices = await prisma.invoice.findMany({
      where: { orderId: { in: createdOrderIds } },
      orderBy: { sequence: "asc" },
      select: { sequence: true, invoiceNumber: true, financialYear: true },
    });
    check("two invoices issued", invoices.length, 2);
    check("sequence increments by one", invoices[1].sequence - invoices[0].sequence, 1);
    check("both in the same financial year", invoices[0].financialYear === invoices[1].financialYear, true);

    // --- Overselling rolls the whole sale back -----------------------------
    console.log("\nScenario: selling more than exists rolls everything back");
    const ordersBefore = await prisma.order.count();
    const invoicesBefore = await prisma.invoice.count();
    const stockBefore = (await inventoryService.getLevels([variantId])).get(variantId)!.quantity;

    let refused: string | null = null;
    try {
      await posService.completeSale({
        lines: [{ variantId, quantity: stockBefore + 50 }],
        payment: { method: "CARD" },
        actorId: admin.id,
      });
    } catch (error) {
      refused = isDomainError(error) ? error.code : "UNKNOWN";
    }
    check("the sale is refused", refused, "INSUFFICIENT_STOCK");
    check("no order was left behind", await prisma.order.count(), ordersBefore);
    check("no invoice was left behind", await prisma.invoice.count(), invoicesBefore);
    check("no invoice number was burned", (await prisma.invoice.count()), invoicesBefore);
    check(
      "stock untouched",
      (await inventoryService.getLevels([variantId])).get(variantId)!.quantity,
      stockBefore,
    );
  } finally {
    // Remove what this run created, restoring stock through the ledger.
    for (const orderId of createdOrderIds) {
      await prisma.invoice.deleteMany({ where: { orderId } });
      await prisma.inventoryMovement.deleteMany({ where: { referenceId: orderId } });
      await prisma.order.deleteMany({ where: { id: orderId } });
    }
    await prisma.inventoryLevel.updateMany({
      where: { variantId, locationId },
      data: { quantity: before },
    });
    console.log(`\nRestored stock to ${before} and removed ${createdOrderIds.length} test order(s)`);
  }

  console.log(`\n${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error("\nPOS verification aborted:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
