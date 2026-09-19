/**
 * Verification harness for the Inventory domain.
 *
 * Runs the stock scenarios from the modularisation brief against a real
 * database, including the concurrency case that the whole design exists to
 * make safe. Every scenario cleans up after itself, so this is safe to
 * re-run — but point it at a development database, never production.
 *
 *     npx tsx scripts/verify-inventory.ts
 */
import { prisma } from "../src/lib/prisma";
// Must come first: populates process.env before anything reads it.
import "./load-env";
import { assertLocalDatabase } from "../prisma/guard-destructive";
import { inventoryService } from "../src/modules/inventory";
import { catalogService } from "../src/modules/catalog";
import { isDomainError } from "../src/modules/_shared/errors";
import { VariantId, type VariantId as VariantIdType } from "../src/modules/_shared/ids";

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

async function availableOf(variantId: VariantIdType): Promise<number> {
  const levels = await inventoryService.getLevels([variantId]);
  return levels.get(variantId)?.available ?? 0;
}

/** Forces a level to a known starting point without going through the ledger. */
async function setStock(variantId: VariantIdType, quantity: number): Promise<void> {
  const locationId = await inventoryService.getDefaultLocationId();
  await prisma.inventoryLevel.update({
    where: { variantId_locationId: { variantId, locationId } },
    data: { quantity, reservedQuantity: 0 },
  });
}

/** Removes ledger entries this harness created, leaving the catalog untouched. */
async function cleanup(variantId: VariantIdType, originalQuantity: number): Promise<void> {
  await prisma.inventoryMovement.deleteMany({
    where: {
      variantId,
      OR: [
        { referenceId: { startsWith: "verify-" } },
        { idempotencyKey: { startsWith: "verify-idem-" } },
      ],
    },
  });
  await prisma.inventoryReservation.deleteMany({
    where: { variantId, referenceId: { startsWith: "verify-" } },
  });
  await setStock(variantId, originalQuantity);
}

async function main(): Promise<void> {
  // This harness writes to stock levels and the movement ledger, so it must
  // never be pointed at a production database.
  assertLocalDatabase("scripts/verify-inventory.ts");

  const [variant] = await catalogService.searchVariants({ limit: 1, sellableOnly: false });
  if (!variant) throw new Error("No variants in the catalog to test against");

  const variantId = variant.variantId;
  const label = `${variant.productName} / ${variant.variantName}`;
  const locationId = await inventoryService.getDefaultLocationId();
  const original = (await inventoryService.getLevels([variantId])).get(variantId)!.quantity;

  console.log(`\nTesting against: ${label}`);
  console.log(`SKU ${variant.sku} · barcode ${variant.barcode}`);
  console.log(`Location ${locationId} · starting quantity ${original}\n`);

  const ctx = { locationId, referenceType: "VERIFY", referenceId: "verify-run", actorId: "verify-script" };

  try {
    // --- Scenario 2: receive stock -----------------------------------------
    console.log("Scenario: receive stock");
    await setStock(variantId, 1);
    await inventoryService.receive([{ variantId, quantity: 3 }], ctx);
    check("1 + 3 receive = 4 available", await availableOf(variantId), 4);
    const receiveMovement = await prisma.inventoryMovement.findFirst({
      where: { variantId, type: "RECEIVE", referenceId: "verify-run" },
      orderBy: { createdAt: "desc" },
    });
    check("RECEIVE movement recorded before/after", [receiveMovement?.beforeQuantity, receiveMovement?.afterQuantity], [1, 4]);

    // --- Scenario 1: cannot sell what is not there -------------------------
    console.log("\nScenario: overselling is refused");
    await setStock(variantId, 0);
    let refused: string | null = null;
    try {
      await inventoryService.commitSale([{ variantId, quantity: 1 }], ctx);
    } catch (error) {
      refused = isDomainError(error) ? error.code : "UNKNOWN";
    }
    check("selling from zero stock is refused", refused, "INSUFFICIENT_STOCK");
    check("stock unchanged after refusal", await availableOf(variantId), 0);

    // --- Scenario 3: a sale consumes stock ---------------------------------
    console.log("\nScenario: a sale consumes stock");
    await setStock(variantId, 1);
    await inventoryService.commitSale([{ variantId, quantity: 1 }], { ...ctx, referenceId: "verify-run" });
    check("1 - 1 sale = 0 available", await availableOf(variantId), 0);

    // --- Reserve / release --------------------------------------------------
    console.log("\nScenario: reserve holds stock, release returns it");
    await setStock(variantId, 2);
    await inventoryService.reserve([{ variantId, quantity: 2 }], { ...ctx, referenceId: "verify-hold" });
    check("both units held, none available", await availableOf(variantId), 0);

    let blocked: string | null = null;
    try {
      await inventoryService.commitSale([{ variantId, quantity: 1 }], ctx);
    } catch (error) {
      blocked = isDomainError(error) ? error.code : "UNKNOWN";
    }
    check("held stock cannot be sold to someone else", blocked, "INSUFFICIENT_STOCK");

    await inventoryService.release([{ variantId, quantity: 1 }], { ...ctx, referenceId: "verify-hold" });
    check("releasing one returns it to the pool", await availableOf(variantId), 1);

    await inventoryService.commitSale([{ variantId, quantity: 1 }], { ...ctx, referenceId: "verify-hold", fromReservation: true });
    const afterSettle = (await inventoryService.getLevels([variantId])).get(variantId)!;
    check("settling the hold drops quantity and reservation", [afterSettle.quantity, afterSettle.reservedQuantity], [1, 0]);

    // --- Scenario 5: two simultaneous sales of the last item ---------------
    console.log("\nScenario: two simultaneous sales of the last item");
    await setStock(variantId, 1);
    const results = await Promise.allSettled([
      inventoryService.commitSale([{ variantId, quantity: 1 }], { ...ctx, referenceId: "verify-a" }),
      inventoryService.commitSale([{ variantId, quantity: 1 }], { ...ctx, referenceId: "verify-b" }),
    ]);
    const fulfilled = results.filter((r) => r.status === "fulfilled").length;
    const rejected = results.filter((r) => r.status === "rejected").length;
    check("exactly one sale succeeded", [fulfilled, rejected], [1, 1]);
    check("stock landed at zero, never negative", await availableOf(variantId), 0);

    const saleMovements = await prisma.inventoryMovement.count({
      where: { variantId, type: "SALE", referenceId: { in: ["verify-a", "verify-b"] } },
    });
    check("only one SALE movement was written", saleMovements, 1);

    // --- Duplicate lines in one basket -------------------------------------
    console.log("\nScenario: the same variant twice in one basket");
    await setStock(variantId, 1);
    let overBasket: string | null = null;
    try {
      await inventoryService.commitSale(
        [{ variantId, quantity: 1 }, { variantId, quantity: 1 }],
        ctx,
      );
    } catch (error) {
      overBasket = isDomainError(error) ? error.code : "UNKNOWN";
    }
    check("two lines of one unit cannot drain a stock of one", overBasket, "INSUFFICIENT_STOCK");
    check("stock untouched after the failed basket", await availableOf(variantId), 1);

    // --- Adjustments require a reason --------------------------------------
    console.log("\nScenario: adjustments are never silent");
    let noReason: string | null = null;
    try {
      await inventoryService.adjust([{ variantId, quantity: 1 }], "DAMAGE", { ...ctx, reason: "  " });
    } catch (error) {
      noReason = isDomainError(error) ? error.code : "UNKNOWN";
    }
    check("an adjustment without a reason is refused", noReason, "VALIDATION_FAILED");

    await inventoryService.adjust([{ variantId, quantity: 1 }], "DAMAGE", { ...ctx, reason: "Scratched in transit" });
    const damage = await prisma.inventoryMovement.findFirst({
      where: { variantId, type: "DAMAGE" },
      orderBy: { createdAt: "desc" },
    });
    check("DAMAGE movement stores its reason", damage?.reason, "Scratched in transit");
    check("damage removed the unit", await availableOf(variantId), 0);

    // --- Reservation bookkeeping -------------------------------------------
    console.log("\nScenario: holds are named and expire");
    await setStock(variantId, 2);
    await prisma.inventoryReservation.deleteMany({ where: { referenceId: "verify-expiry" } });
    await inventoryService.reserve([{ variantId, quantity: 2 }], { ...ctx, referenceId: "verify-expiry" });

    const held = await prisma.inventoryReservation.findFirst({
      where: { variantId, referenceId: "verify-expiry" },
    });
    check("a named hold row was written", [held?.status, held?.quantity], ["HELD", 2]);
    check("the hold is not available to anyone else", await availableOf(variantId), 0);

    // Backdate it so the sweeper treats it as abandoned.
    await prisma.inventoryReservation.updateMany({
      where: { referenceId: "verify-expiry" },
      data: { expiresAt: new Date(Date.now() - 60_000) },
    });
    const swept = await inventoryService.releaseExpiredReservations();
    check("the expired hold was swept", swept >= 1, true);
    check("swept stock returned to the pool", await availableOf(variantId), 2);

    const afterSweep = await prisma.inventoryReservation.findFirst({
      where: { referenceId: "verify-expiry" },
    });
    check("the swept hold is marked released", afterSweep?.status, "RELEASED");

    const sweepLedger = await prisma.inventoryMovement.count({
      where: { variantId, type: "RELEASE", referenceId: "verify-expiry" },
    });
    check("the sweep left a ledger entry", sweepLedger, 1);

    // --- Idempotency --------------------------------------------------------
    console.log("\nScenario: a retried request applies once");
    await setStock(variantId, 5);
    const key = `verify-idem-${Date.now()}`;
    await inventoryService.receive([{ variantId, quantity: 2 }], { ...ctx, idempotencyKey: key });
    await inventoryService.receive([{ variantId, quantity: 2 }], { ...ctx, idempotencyKey: key });
    check("the retry did not add stock twice", await availableOf(variantId), 7);

    const idemMovements = await prisma.inventoryMovement.count({
      where: { idempotencyKey: { startsWith: key } },
    });
    check("only one movement was written for the key", idemMovements, 1);

    // --- Unknown barcode ----------------------------------------------------
    console.log("\nScenario: an unknown barcode creates nothing");
    const productsBefore = await prisma.product.count();
    const unknown = await catalogService.findVariantByCode("LAV9999999999");
    check("unknown barcode resolves to nothing", unknown, null);
    check("no product was invented", await prisma.product.count(), productsBefore);

    // --- Batch lookup -------------------------------------------------------
    console.log("\nScenario: batch reads");
    const many = await catalogService.searchVariants({ limit: 5, sellableOnly: false });
    const ids = many.map((v) => VariantId(v.variantId));
    const levels = await inventoryService.getLevels(ids);
    check("every requested variant comes back", levels.size, ids.length);
  } finally {
    await cleanup(variantId, original);
    console.log(`\nRestored ${label} to quantity ${original}`);
  }

  console.log(`\n${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error("\nVerification aborted:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
