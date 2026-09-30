/**
 * Exercises retiring and force-deleting a product against the LOCAL database.
 *
 * Builds a throwaway product that has been received, sold and ordered, then
 * checks each rule: a sold product is not deleted without force, a retired
 * product cannot be restocked, it leaves the storefront when it sells out,
 * and a forced delete keeps the order line and the stock ledger.
 * Everything it creates is removed at the end.
 */
import "./load-env";
import { assertLocalDatabase } from "../prisma/guard-destructive";
import { prisma } from "../src/lib/prisma";
import {
  assertNoneRetired,
  deleteProduct,
  setProductRetired,
  withdrawSoldOutRetiredProducts,
} from "../src/modules/catalog";
import { isDomainError } from "../src/modules/_shared/errors";

function check(label: string, ok: boolean) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) process.exitCode = 1;
}

async function codeOf(run: () => Promise<unknown>) {
  try {
    await run();
    return null;
  } catch (error) {
    return isDomainError(error) ? error.code : String(error);
  }
}

async function main() {
  assertLocalDatabase("verify-product-lifecycle");
  const stamp = Date.now();
  const [category, location] = await Promise.all([
    prisma.category.findFirstOrThrow({ select: { id: true } }),
    prisma.inventoryLocation.findFirstOrThrow({ select: { id: true } }),
  ]);

  const product = await prisma.product.create({
    data: {
      name: `Lifecycle Test ${stamp}`,
      slug: `lifecycle-test-${stamp}`,
      priceCents: 99_900,
      categoryId: category.id,
      isPublished: true,
      variants: { create: { name: "Default", isDefault: true, sku: `LT-${stamp}` } },
    },
    select: { id: true, variants: { select: { id: true } } },
  });
  const variantId = product.variants[0].id;

  await prisma.inventoryLevel.create({ data: { variantId, locationId: location.id, quantity: 1 } });
  await prisma.inventoryMovement.create({
    data: { variantId, locationId: location.id, type: "RECEIVE", quantity: 1, beforeQuantity: 0, afterQuantity: 1 },
  });
  const order = await prisma.order.create({
    data: {
      orderNumber: `LT-${stamp}`,
      source: "STORE",
      totalCents: 99_900,
      items: { create: { productId: product.id, variantId, quantity: 1, priceCents: 99_900, name: `Lifecycle Test ${stamp}`, sku: `LT-${stamp}` } },
    },
    select: { id: true },
  });

  try {
    check("sold product is not deleted without force",
      (await codeOf(() => deleteProduct(product.id))) === "PRODUCT_HAS_ORDERS");

    await setProductRetired(product.id, true);
    let row = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    check("retiring with stock left keeps it published", row.retiredAt !== null && row.isPublished);

    check("retired product cannot be received",
      (await codeOf(() => assertNoneRetired([variantId]))) === "PRODUCT_RETIRED");

    await prisma.inventoryLevel.updateMany({ where: { variantId }, data: { quantity: 0 } });
    const withdrawn = await withdrawSoldOutRetiredProducts(prisma, { variantIds: [variantId] });
    row = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    check("selling the last unit takes it off the storefront", withdrawn === 1 && !row.isPublished);

    await setProductRetired(product.id, false);
    row = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    check("reinstating clears retirement and does not republish", row.retiredAt === null && !row.isPublished);

    const deletion = await deleteProduct(product.id, { force: true });
    check("forced delete reports the kept order line", deletion.orderLineCount === 1);
    check("product is gone", (await prisma.product.count({ where: { id: product.id } })) === 0);

    const line = await prisma.orderItem.findFirstOrThrow({ where: { orderId: order.id } });
    check("order line survives with its snapshot", line.productId === null && line.sku === `LT-${stamp}`);

    const movement = await prisma.inventoryMovement.findFirstOrThrow({
      where: { itemLabel: { contains: `Lifecycle Test ${stamp}` } },
    });
    check("stock ledger keeps the movement, labelled",
      movement.variantId === null && movement.itemLabel === `Lifecycle Test ${stamp} · LT-${stamp}`);
  } finally {
    await prisma.order.delete({ where: { id: order.id } });
    await prisma.inventoryMovement.deleteMany({ where: { itemLabel: { contains: `Lifecycle Test ${stamp}` } } });
    await prisma.product.deleteMany({ where: { id: product.id } });
  }
}

main()
  .then(() => process.exit(process.exitCode ?? 0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
