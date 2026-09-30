/**
 * A counter sale under a live offer, end to end, against the LOCAL database:
 * the order, its lines, the per-line allocations, the offer's use count, GST
 * per line and the invoice. Everything it creates is removed afterwards and
 * stock is restored.
 *
 *   npx tsx scripts/verify-promotion-orders.ts
 */
import "./load-env";
import { assertLocalDatabase } from "../prisma/guard-destructive";
import { prisma } from "../src/lib/prisma";
import { catalogService } from "../src/modules/catalog";
import { inventoryService } from "../src/modules/inventory";
import { posService } from "../src/modules/pos";
import { toEnginePromotion } from "../src/modules/promotions/mapping";
import { PROMOTION_INCLUDE } from "../src/modules/promotions/repository";
import { VariantId } from "../src/modules/_shared/ids";

let failed = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failed += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${ok ? "" : `  (expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)})`}`);
}

async function main() {
  assertLocalDatabase("verify-promotion-orders");
  const candidates = await catalogService.searchVariants({ limit: 40, sellableOnly: true });
  const levels = await inventoryService.getLevels(candidates.map((v) => VariantId(v.variantId)));
  const [a, b] = candidates.filter((v) => (levels.get(v.variantId)?.available ?? 0) >= 1);
  if (!a || !b) throw new Error("Need two sellable variants in stock");

  const list = a.priceCents + b.priceCents;
  const setPrice = Math.floor(list * 0.7);
  const admin = await prisma.user.findFirstOrThrow({ where: { role: "ADMIN" }, select: { id: true } });
  const before = { a: levels.get(a.variantId)!.quantity, b: levels.get(b.variantId)!.quantity };

  const promotion = await prisma.promotion.create({
    data: {
      name: "Verify — any 2",
      template: "ANY_N_FOR_X",
      pieces: { include: [{ type: "products", ids: [a.productId, b.productId] }], exclude: [] },
      benefit: { type: "setPrice", setSize: 2, priceCents: setPrice },
      invoiceLabel: "Offer: Verify pair",
      usageLimit: 5,
      activatedAt: new Date(),
    },
    include: PROMOTION_INCLUDE,
  });

  let orderId: string | null = null;
  try {
    const engine = toEnginePromotion(promotion)!;
    const sale = await posService.completeSale({
      lines: [
        { variantId: VariantId(a.variantId), quantity: 1 },
        { variantId: VariantId(b.variantId), quantity: 1 },
      ],
      payment: { method: "CASH" },
      pricing: { promotions: [engine], pricesIncludeTax: false },
      actorId: admin.id,
    });
    orderId = sale.orderId;

    const order = await prisma.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { items: { include: { promotionAllocations: true } } },
    });
    const saving = list - setPrice;
    const lineTax = order.items.reduce((sum, i) => sum + i.taxCents, 0);

    check("order subtotal is the list total", order.totalCents, list);
    check("order discount is the set saving", order.discountCents, saving);
    check("lines carry the promotion discount", order.items.reduce((s, i) => s + i.promotionDiscountCents, 0), saving);
    check("allocations add up to the saving", order.items.flatMap((i) => i.promotionAllocations).reduce((s, x) => s + x.amountCents, 0), saving);
    check("allocations use the invoice label", [...new Set(order.items.flatMap((i) => i.promotionAllocations.map((x) => x.label)))], ["Offer: Verify pair"]);
    check("order tax is the sum of line taxes", order.taxCents, lineTax);
    check("each line is price × quantity at its net", order.items.every((i) => i.priceCents === i.catalogPriceCents! - i.promotionDiscountCents / i.quantity), true);
    check("payment is list − saving + GST", sale.grandTotalCents, setPrice + lineTax);
    check("invoice total matches the payment", sale.invoice.totals.grandTotalCents, sale.grandTotalCents);
    check("invoice names the offer", sale.invoice.totals.offers?.map((o) => o.label), ["Verify — any 2"].map(() => engine.label));

    const after = await prisma.promotion.findUniqueOrThrow({ where: { id: promotion.id } });
    check("the offer's use is counted", [after.usedCount, after.discountGivenCents], [1, saving]);
  } finally {
    if (orderId) {
      await prisma.invoice.deleteMany({ where: { orderId } });
      await prisma.inventoryMovement.deleteMany({ where: { referenceId: orderId } });
      await prisma.order.deleteMany({ where: { id: orderId } });
    }
    await prisma.promotion.delete({ where: { id: promotion.id } });
    const location = await inventoryService.getDefaultLocationId();
    await prisma.inventoryLevel.updateMany({ where: { variantId: a.variantId, locationId: location }, data: { quantity: before.a } });
    await prisma.inventoryLevel.updateMany({ where: { variantId: b.variantId, locationId: location }, data: { quantity: before.b } });
    console.log("\nCleaned up the test order and offer, stock restored.");
  }

  console.log(failed === 0 ? "All order checks passed." : `${failed} check(s) failed.`);
  process.exitCode = failed === 0 ? 0 : 1;
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
