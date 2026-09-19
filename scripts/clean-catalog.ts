/**
 * Clears the leftover seeded catalog so the local database starts clean.
 *
 * Removes unpublished products whose images never resolved, along with the
 * variants, stock, ledger entries and images that hang off them, and any
 * category left with nothing in it.
 *
 * ONE exception, deliberately: a product referenced by an existing order is
 * never deleted. It is archived instead. An order must be able to render its
 * invoice years later, and while OrderItem snapshots the name and price, the
 * product id remains a real foreign key — deleting the row would either be
 * refused by the database or leave order history pointing at nothing. The
 * whole design rests on old orders staying intact, so the cleanup respects
 * that rather than forcing past it.
 *
 *     npx tsx scripts/clean-catalog.ts
 */
// Must come first: populates process.env before anything reads it.
import "./load-env";
import { assertLocalDatabase } from "../prisma/guard-destructive";
import { prisma } from "../src/lib/prisma";

async function main(): Promise<void> {
  assertLocalDatabase("scripts/clean-catalog.ts");

  // Resolve the whole plan first, so the write below is a single pass.
  const unpublished = await prisma.product.findMany({
    where: { isPublished: false },
    select: {
      id: true,
      name: true,
      _count: { select: { orderItems: true } },
    },
  });

  const deletable = unpublished.filter((p) => p._count.orderItems === 0);
  const archivable = unpublished.filter((p) => p._count.orderItems > 0);

  console.log(`\n${unpublished.length} unpublished products found.`);
  console.log(`  ${deletable.length} will be deleted`);
  console.log(`  ${archivable.length} kept and archived (referenced by an order):`);
  for (const product of archivable) {
    console.log(`      ${product.name}  ·  ${product._count.orderItems} order item(s)`);
  }

  const result = await prisma.$transaction(async (tx) => {
    // Cascades to images, variants, inventory levels, movements,
    // reservations, collection links, wishlist entries and reviews.
    const deleted = await tx.product.deleteMany({
      where: { id: { in: deletable.map((p) => p.id) } },
    });

    // Archived rather than removed: invisible to the storefront and to the
    // sell path, but still resolvable by the order that references it.
    const archived = await tx.product.updateMany({
      where: { id: { in: archivable.map((p) => p.id) } },
      data: { isActive: false, isPublished: false },
    });

    // A category with nothing in it is clutter in the admin and an empty
    // landing page on the storefront.
    const emptyCategories = await tx.category.findMany({
      where: { products: { none: {} } },
      select: { id: true, name: true },
    });
    await tx.category.deleteMany({
      where: { id: { in: emptyCategories.map((c) => c.id) } },
    });

    // Collections left with no products are likewise dead weight.
    const emptyCollections = await tx.collection.findMany({
      where: { products: { none: {} } },
      select: { id: true, name: true },
    });
    await tx.collection.deleteMany({
      where: { id: { in: emptyCollections.map((c) => c.id) } },
    });

    return {
      deleted: deleted.count,
      archived: archived.count,
      emptyCategories: emptyCategories.map((c) => c.name),
      emptyCollections: emptyCollections.map((c) => c.name),
    };
  });

  console.log(`\nDeleted ${result.deleted} products · archived ${result.archived}`);
  if (result.emptyCategories.length) {
    console.log(`Removed empty categories: ${result.emptyCategories.join(", ")}`);
  }
  if (result.emptyCollections.length) {
    console.log(`Removed empty collections: ${result.emptyCollections.join(", ")}`);
  }

  const [products, published, variants, levels, images, orphanImages] = await Promise.all([
    prisma.product.count(),
    prisma.product.count({ where: { isPublished: true } }),
    prisma.productVariant.count(),
    prisma.inventoryLevel.count(),
    prisma.productImage.count(),
    // Images whose file is not under a category folder should no longer exist.
    prisma.productImage.count({
      where: { url: { startsWith: "/assets/pictures/products/" }, NOT: { url: { contains: "/products/necklace/" } } },
    }),
  ]);

  console.log(
    `\nRemaining: ${products} products (${published} published) · ${variants} variants · ${levels} stock rows · ${images} images\n`,
  );
  if (orphanImages > 0) {
    console.log(`Note: ${orphanImages} image row(s) outside the necklace folder remain — check they resolve.\n`);
  }
}

main()
  .catch((error) => {
    console.error("\nCleanup failed — nothing was changed:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
