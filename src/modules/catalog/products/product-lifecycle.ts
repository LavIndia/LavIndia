/**
 * The end of a product's life in the catalog: retiring it, and deleting it.
 *
 * The two are deliberately different things.
 *
 *   - RETIRING says the shop will never stock the piece again. It stays in
 *     the catalog, what is on the shelf keeps selling, and it leaves the
 *     storefront on its own when the last unit goes. Fully reversible.
 *
 *   - DELETING removes the product and its variants from the catalog. The
 *     records that mention it — order lines, invoices, the stock ledger — are
 *     kept, reading from the snapshots they took at the time. Not reversible.
 *
 * Deleting a product that has been sold needs `force`, so that removing a
 * piece with a sales history is always a decision and never an accident.
 */
import { Prisma } from "@prisma/client";
import { prisma, type Db } from "../../_shared/db";
import { DomainError } from "../../_shared/errors";

export interface ProductDeletion {
  productId: string;
  productName: string;
  /** Image paths the caller should remove from storage once this commits. */
  imageUrls: string[];
  /** Order lines that now point at nothing and read from their snapshots. */
  orderLineCount: number;
}

/**
 * Deletes a product, keeping every record of it having existed.
 *
 * One transaction, three statements: the stock ledger is labelled with what
 * each movement was (the variant is about to disappear from under it), then
 * the product goes. The foreign keys do the rest — variants, stock levels
 * and holds are removed with it, order lines and ledger movements are kept
 * with their link cleared.
 */
export async function deleteProduct(
  productId: string,
  options: { force?: boolean } = {},
): Promise<ProductDeletion> {
  return prisma.$transaction(
    async (tx) => {
      const product = await tx.product.findUnique({
        where: { id: productId },
        select: {
          id: true,
          name: true,
          images: { select: { url: true } },
          _count: { select: { orderItems: true } },
        },
      });

      if (!product) {
        throw new DomainError("PRODUCT_NOT_FOUND", "Product not found", { productId });
      }

      const orderLineCount = product._count.orderItems;
      if (orderLineCount > 0 && !options.force) {
        throw new DomainError(
          "PRODUCT_HAS_ORDERS",
          `${product.name} appears on ${orderLineCount} order line${orderLineCount === 1 ? "" : "s"}`,
          { productId, orderLineCount },
        );
      }

      // "Product — Variant · SKU", with the variant left out for the implicit
      // Default variant of a product that has no options.
      await tx.$executeRaw(Prisma.sql`
        UPDATE "inventory_movements" m
           SET "itemLabel" = p."name"
                 || CASE WHEN v."isDefault" THEN '' ELSE ' — ' || v."name" END
                 || COALESCE(' · ' || v."sku", '')
          FROM "product_variants" v
          JOIN "products" p ON p."id" = v."productId"
         WHERE m."variantId" = v."id"
           AND v."productId" = ${productId}
           AND m."itemLabel" IS NULL
      `);

      await tx.product.delete({ where: { id: productId } });

      return {
        productId: product.id,
        productName: product.name,
        imageUrls: product.images.map((image) => image.url),
        orderLineCount,
      };
    },
    { timeout: 20_000, maxWait: 10_000 },
  );
}

/**
 * Marks a product as never to be stocked again, or undoes that.
 *
 * Retiring a piece that is already sold out takes it off the storefront at
 * once, rather than leaving a dead listing until something else happens to
 * it. Reinstating does not publish it again: whether it goes back online is
 * the admin's call, made on the product itself.
 */
export async function setProductRetired(productId: string, retired: boolean): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const updated = await tx.product.updateMany({
      where: { id: productId },
      data: { retiredAt: retired ? new Date() : null },
    });
    if (updated.count === 0) {
      throw new DomainError("PRODUCT_NOT_FOUND", "Product not found", { productId });
    }
    if (retired) await withdrawSoldOutRetiredProducts(tx, { productIds: [productId] });
  });
}

/**
 * Takes retired products off the storefront once nothing is left to sell.
 *
 * Called after anything that can take the last unit — a sale, an adjustment,
 * a stock count — with the variants or products it touched. One statement,
 * and a no-op for every product that is not retired, so it is safe to call
 * on every sale.
 *
 * This is the documented exception to "Catalog does not read Inventory's
 * tables": whether anything is left to sell is exactly the fact this rule
 * turns on, and asking through the Inventory contract would cost a round trip
 * on the busiest write path in the shop. Nothing here writes to Inventory.
 */
export async function withdrawSoldOutRetiredProducts(
  db: Db,
  scope: { productIds?: readonly string[]; variantIds?: readonly string[] },
): Promise<number> {
  const productIds = scope.productIds ?? [];
  const variantIds = scope.variantIds ?? [];
  if (productIds.length === 0 && variantIds.length === 0) return 0;

  const inScope = Prisma.sql`(
    p."id" IN (${Prisma.join(productIds.length ? productIds : [""])})
    OR p."id" IN (
      SELECT v."productId" FROM "product_variants" v
       WHERE v."id" IN (${Prisma.join(variantIds.length ? variantIds : [""])})
    )
  )`;

  return db.$executeRaw(Prisma.sql`
    UPDATE "products" p
       SET "isPublished" = false, "updatedAt" = now()
     WHERE p."retiredAt" IS NOT NULL
       AND p."isPublished" = true
       AND ${inScope}
       AND NOT EXISTS (
         SELECT 1
           FROM "product_variants" v
           JOIN "inventory_levels" lvl ON lvl."variantId" = v."id"
          WHERE v."productId" = p."id"
            AND v."isActive" = true
            AND lvl."quantity" > 0
       )
  `);
}

/**
 * Refuses new stock for retired products.
 *
 * Only receiving is refused. Corrections — a recount, a damaged piece, a
 * return — still have to be recordable, because they describe stock that
 * already exists rather than a decision to buy more.
 */
export async function assertNoneRetired(variantIds: readonly string[]): Promise<void> {
  if (variantIds.length === 0) return;
  const retired = await prisma.productVariant.findMany({
    where: { id: { in: [...variantIds] }, product: { retiredAt: { not: null } } },
    select: { product: { select: { name: true } } },
  });
  if (retired.length === 0) return;

  const names = [...new Set(retired.map((row) => row.product.name))];
  throw new DomainError(
    "PRODUCT_RETIRED",
    `${names.join(", ")} ${names.length === 1 ? "is" : "are"} retired and cannot be restocked`,
    { products: names },
  );
}
