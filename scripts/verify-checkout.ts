/**
 * Verifies the online checkout's stock handling.
 *
 * This is the path that previously could oversell: the storefront cart lives
 * in the browser, and before this work nothing server-side stopped two
 * shoppers buying the same last piece.
 *
 *     npx tsx scripts/verify-checkout.ts
 */
// Must come first: populates process.env before anything reads it.
import "./load-env";
import { assertLocalDatabase } from "../prisma/guard-destructive";
import { prisma } from "../src/lib/prisma";
import { checkoutService } from "../src/modules/ecommerce";
import { catalogService } from "../src/modules/catalog";
import { inventoryService } from "../src/modules/inventory";
import { isDomainError } from "../src/modules/_shared/errors";
import { OrderId, VariantId } from "../src/modules/_shared/ids";

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
  assertLocalDatabase("scripts/verify-checkout.ts");

  const [variant] = await catalogService.searchVariants({ limit: 1, sellableOnly: true });
  if (!variant) throw new Error("No sellable variant to test against");

  const variantId = VariantId(variant.variantId);
  const locationId = await inventoryService.getDefaultLocationId();
  const original = (await inventoryService.getLevels([variantId])).get(variantId)!.quantity;

  const setStock = async (quantity: number) => {
    await prisma.inventoryLevel.updateMany({
      where: { variantId, locationId },
      data: { quantity, reservedQuantity: 0 },
    });
    await prisma.inventoryReservation.deleteMany({ where: { variantId } });
  };

  const levelOf = async () => (await inventoryService.getLevels([variantId])).get(variantId)!;
  const lines = [{ variantId: variant.variantId, quantity: 1 }];

  console.log(`\nChecking out: ${variant.productName} / ${variant.variantName}\n`);

  try {
    // --- Validation is advisory but correct ---------------------------------
    console.log("Scenario: a basket is checked before payment");
    await setStock(1);
    check("one piece is enough for one", (await checkoutService.validate(lines)).ok, true);

    const tooMany = await checkoutService.validate([
      { variantId: variant.variantId, quantity: 5 },
    ]);
    check("five is not", tooMany.ok, false);
    check("and it says how many there are", tooMany.problems[0].available, 1);
    check(
      "prices come from the catalog, not the caller",
      (await checkoutService.validate(lines)).subtotalCents,
      variant.priceCents,
    );

    // --- Reserve holds the piece --------------------------------------------
    console.log("\nScenario: stock is held while the customer pays");
    await setStock(1);
    await checkoutService.reserveForOrder(OrderId("verify-order-a"), lines);

    const held = await levelOf();
    check("still on the shelf, but committed", [held.quantity, held.reservedQuantity], [1, 1]);
    check("and nothing is available to anyone else", held.available, 0);

    let blocked: string | null = null;
    try {
      await checkoutService.reserveForOrder(OrderId("verify-order-b"), lines);
    } catch (error) {
      blocked = isDomainError(error) ? error.code : "UNKNOWN";
    }
    check("a second shopper cannot hold the same piece", blocked, "INSUFFICIENT_STOCK");

    // --- Payment fails: the hold goes back ----------------------------------
    console.log("\nScenario: the payment fails");
    await checkoutService.releaseForOrder(OrderId("verify-order-a"), lines);
    const released = await levelOf();
    check("the piece returns to the shelf", [released.quantity, released.available], [1, 1]);

    // --- Payment succeeds: the hold becomes a sale ---------------------------
    console.log("\nScenario: the payment succeeds");
    await setStock(1);
    await checkoutService.reserveForOrder(OrderId("verify-order-c"), lines);
    await checkoutService.commitPaidOrder(OrderId("verify-order-c"), lines);

    const sold = await levelOf();
    check("stock is consumed and the hold cleared", [sold.quantity, sold.reservedQuantity], [0, 0]);

    const movements = await prisma.inventoryMovement.findMany({
      where: { variantId, referenceId: "verify-order-c" },
      select: { type: true },
      orderBy: { createdAt: "asc" },
    });
    check(
      "the ledger shows the hold and the sale",
      movements.map((m) => m.type),
      ["RESERVE", "SALE"],
    );

    // --- Two shoppers, one piece, at the same instant ------------------------
    console.log("\nScenario: two shoppers check out the last piece simultaneously");
    await setStock(1);
    const results = await Promise.allSettled([
      checkoutService.reserveForOrder(OrderId("verify-race-a"), lines),
      checkoutService.reserveForOrder(OrderId("verify-race-b"), lines),
    ]);
    const fulfilled = results.filter((r) => r.status === "fulfilled").length;
    check("exactly one succeeds", [fulfilled, results.length - fulfilled], [1, 1]);

    const raced = await levelOf();
    check("one piece held, none oversold", [raced.quantity, raced.reservedQuantity], [1, 1]);
    check("never negative", raced.available >= 0, true);
  } finally {
    await prisma.inventoryMovement.deleteMany({
      where: { variantId, referenceId: { startsWith: "verify-" } },
    });
    await prisma.inventoryReservation.deleteMany({
      where: { variantId, referenceId: { startsWith: "verify-" } },
    });
    await setStock(original);
    console.log(`\nRestored stock to ${original}`);
  }

  console.log(`\n${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error("\nCheckout verification aborted:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
