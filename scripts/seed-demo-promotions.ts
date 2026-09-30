/**
 * Creates a few real offers against the local catalog, so the engine can be
 * tried at checkout and at the counter before the admin screens exist.
 *
 * Safe to re-run: each offer is named "Demo — ..." and existing ones with
 * the same name are replaced rather than duplicated.
 *
 *   npx tsx scripts/seed-demo-promotions.ts          (create/replace)
 *   npx tsx scripts/seed-demo-promotions.ts --remove  (delete the demo offers)
 */
import "./load-env";
import { assertLocalDatabase } from "../prisma/guard-destructive";
import { prisma } from "../src/lib/prisma";
import type { Prisma } from "@prisma/client";

const remove = process.argv.includes("--remove");

async function main() {
  assertLocalDatabase("seed-demo-promotions");

  const categories = await prisma.category.findMany({ select: { id: true, name: true } });
  const byName = (name: string) => categories.find((c) => c.name === name)?.id;
  const earringsId = byName("Earrings");
  const necklacesId = byName("Necklaces");
  if (!earringsId || !necklacesId) throw new Error("Expected Earrings and Necklaces categories");

  // "Any 3 for ₹999" names exactly which pieces qualify — a chosen set of
  // studs, not every Earring — because a category selector would pull in
  // ₹1,699 pieces the admin never meant to include at that price.
  const trioStuds = await prisma.product.findMany({
    where: {
      categoryId: earringsId,
      isPublished: true,
      isActive: true,
      priceCents: { lte: 1_25_000 },
    },
    select: { id: true },
    orderBy: { priceCents: "asc" },
    take: 4,
  });
  if (trioStuds.length < 3) throw new Error("Need at least 3 Earrings priced ₹1,250 or under");

  const existing = await prisma.promotion.findMany({
    where: { name: { startsWith: "Demo — " } },
    select: { id: true },
  });
  await prisma.promotion.deleteMany({ where: { id: { in: existing.map((p) => p.id) } } });
  if (remove) {
    console.log(`Removed ${existing.length} demo offer(s).`);
    return;
  }

  const offers: Prisma.PromotionCreateInput[] = [
    {
      name: "Demo — Any 3 for ₹999",
      template: "ANY_N_FOR_X",
      channels: ["ONLINE", "STORE"],
      // Only these 4 studs qualify — not every Earring. See trioStuds above.
      pieces: { include: [{ type: "products", ids: trioStuds.map((p) => p.id) }], exclude: [] },
      benefit: { type: "setPrice", setSize: 3, priceCents: 99_900 },
      title: "Any 3 for ₹999",
      badge: "3 for ₹999",
      nudgeText: "Add {remaining} to get 3 for ₹999",
      appliedText: "{offer} · you save {saving}",
      invoiceLabel: "Offer: Any 3 for ₹999",
      showOnStorefront: true,
      activatedAt: new Date(),
    },
    {
      name: "Demo — Buy 2 Get 1 Free Earrings",
      template: "BUY_X_GET_Y",
      channels: ["ONLINE", "STORE"],
      pieces: { include: [{ type: "categories", ids: [earringsId] }], exclude: [] },
      benefit: {
        type: "reward",
        buyQuantity: 2,
        getQuantity: 1,
        gets: null,
        value: { type: "percent", bps: 10_000 },
        pick: "CHEAPEST",
      },
      title: "Buy 2 Get 1 Free — Earrings",
      badge: "Buy 2 Get 1",
      nudgeText: "Add {remaining} to get an Earring free",
      appliedText: "{offer} · you save {saving}",
      invoiceLabel: "Offer: Buy 2 Get 1 Free Earrings",
      showOnStorefront: true,
      activatedAt: new Date(),
    },
    {
      // A price rule, not a fixed list: any piece over ₹2,000 qualifies,
      // today's two ₹2,499 Necklaces included, and any future piece priced
      // that high joins automatically without editing this offer.
      name: "Demo — Buy 4 Get 1 Free above ₹2,000",
      template: "BUY_X_GET_Y",
      channels: ["ONLINE", "STORE"],
      pieces: { include: [{ type: "priceRange", minCents: 2_00_001 }], exclude: [] },
      benefit: {
        type: "reward",
        buyQuantity: 4,
        getQuantity: 1,
        gets: null,
        value: { type: "percent", bps: 10_000 },
        pick: "CHEAPEST",
      },
      title: "Buy 4 Get 1 Free",
      badge: "Buy 4 Get 1",
      nudgeText: "Add {remaining} priced over ₹2,000 to get one free",
      appliedText: "{offer} · you save {saving}",
      invoiceLabel: "Offer: Buy 4 Get 1 Free above ₹2,000",
      showOnStorefront: true,
      activatedAt: new Date(),
    },
    {
      name: "Demo — 10% off Necklaces",
      template: "PERCENT_OFF",
      channels: ["ONLINE", "STORE"],
      pieces: { include: [{ type: "categories", ids: [necklacesId] }], exclude: [] },
      benefit: { type: "percentOff", bps: 1_000 },
      title: "10% off Necklaces",
      badge: "10% off",
      appliedText: "{offer} · you save {saving}",
      invoiceLabel: "Offer: 10% off Necklaces",
      showOnStorefront: true,
      combinesWithOtherClasses: false,
      activatedAt: new Date(),
    },
  ];

  for (const data of offers) {
    const created = await prisma.promotion.create({ data });
    console.log(`created  ${created.name}`);
  }
  console.log(`\n${offers.length} demo offer(s) live now. Run with --remove to take them out again.`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
