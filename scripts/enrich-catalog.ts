/**
 * Fills out the tables around the products, in ONE pass.
 *
 * The curation pass gave the five photographed necklaces real names, copy and
 * prices. This gives them everything a storefront actually reads: sellable
 * variants with their own SKUs, barcodes and stock; collections; filter
 * facets; and reviews, so star ratings and counts render against something
 * real instead of zero.
 *
 * Idempotent — every write is an upsert or is keyed on a stable identifier,
 * so re-running converges rather than duplicating. Runs inside a single
 * transaction: the catalog ends up fully enriched, or unchanged.
 *
 *     npx tsx scripts/enrich-catalog.ts
 */
// Must come first: populates process.env before anything reads it.
import "./load-env";
import { assertLocalDatabase } from "../prisma/guard-destructive";
import { prisma } from "../src/lib/prisma";
import { allocateIdentifiers } from "../src/modules/catalog";
import {
  COLLECTIONS,
  FILTERS,
  PRODUCT_ENRICHMENT,
  REVIEWS,
} from "./catalog-enrichment-data";

async function main(): Promise<void> {
  assertLocalDatabase("scripts/enrich-catalog.ts");

  const location = await prisma.inventoryLocation.findFirstOrThrow({
    where: { isDefault: true },
    select: { id: true },
  });

  // Everything needed is resolved up front so the transaction below is one
  // uninterrupted write rather than a read-write-read cycle.
  const slugs = PRODUCT_ENRICHMENT.map((p) => p.slug);
  const products = await prisma.product.findMany({
    where: { slug: { in: slugs } },
    select: {
      id: true,
      slug: true,
      priceCents: true,
      categoryId: true,
      variants: { select: { id: true, sku: true }, orderBy: { position: "asc" } },
    },
  });
  const bySlug = new Map(products.map((p) => [p.slug, p]));

  const customers = await prisma.user.findMany({
    where: { role: "CUSTOMER" },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });

  // Variants beyond the first need identifiers; allocate them all in one go.
  const newVariantRequests = PRODUCT_ENRICHMENT.flatMap((enrichment) => {
    const product = bySlug.get(enrichment.slug);
    if (!product) return [];
    return enrichment.variants
      .slice(1)
      .map(() => ({ productSlug: enrichment.slug, needsSku: true, needsBarcode: true }));
  });
  const identifiers = await allocateIdentifiers(prisma, newVariantRequests);
  let identifierCursor = 0;

  await prisma.$transaction(async (tx) => {
    // ---- Collections -----------------------------------------------------
    const collectionIds = new Map<string, string>();
    for (const collection of COLLECTIONS) {
      const row = await tx.collection.upsert({
        where: { slug: collection.slug },
        update: { name: collection.name, description: collection.description },
        create: collection,
        select: { id: true },
      });
      collectionIds.set(collection.slug, row.id);
    }

    // ---- Filters and their options ---------------------------------------
    for (const filter of FILTERS) {
      const row = await tx.filter.upsert({
        where: { slug: filter.slug },
        update: { name: filter.name, type: filter.type, order: filter.order, isActive: true },
        create: {
          slug: filter.slug,
          name: filter.name,
          type: filter.type,
          order: filter.order,
          isActive: true,
        },
        select: { id: true },
      });

      for (const [index, option] of filter.options.entries()) {
        await tx.filterOption.upsert({
          where: { filterId_value: { filterId: row.id, value: option.value } },
          update: { label: option.label, color: option.color ?? null, order: index },
          create: {
            filterId: row.id,
            value: option.value,
            label: option.label,
            color: option.color ?? null,
            order: index,
          },
        });
      }

      // Every filter applies to every category the enriched products sit in.
      const categoryIds = [...new Set(products.map((p) => p.categoryId))];
      for (const categoryId of categoryIds) {
        await tx.filterCategory.upsert({
          where: { filterId_categoryId: { filterId: row.id, categoryId } },
          update: {},
          create: { filterId: row.id, categoryId, order: filter.order },
        });
      }
    }

    // ---- Variants, stock and collection membership ------------------------
    let variantsCreated = 0;

    for (const enrichment of PRODUCT_ENRICHMENT) {
      const product = bySlug.get(enrichment.slug);
      if (!product) {
        console.log(`  MISS  ${enrichment.slug} — product not found`);
        continue;
      }

      for (const [index, option] of enrichment.variants.entries()) {
        const priceCents = option.priceDeltaCents
          ? product.priceCents + option.priceDeltaCents
          : null;

        if (index === 0) {
          // The existing default variant becomes the first real option, so
          // its identifiers and ledger history carry over intact.
          const existing = product.variants[0];
          if (!existing) continue;

          await tx.productVariant.update({
            where: { id: existing.id },
            data: {
              name: option.name,
              size: option.size,
              position: 0,
              isDefault: enrichment.variants.length === 1,
              priceCents,
              isActive: true,
            },
          });
          await tx.inventoryLevel.updateMany({
            where: { variantId: existing.id, locationId: location.id },
            data: { quantity: option.quantity },
          });
          continue;
        }

        const ids = identifiers[identifierCursor++];
        const created = await tx.productVariant.upsert({
          // SKU is unique, which makes it the natural idempotency key here.
          where: { sku: ids.sku ?? `${enrichment.slug}-${index}` },
          update: { name: option.name, size: option.size, position: index, priceCents },
          create: {
            productId: product.id,
            name: option.name,
            size: option.size,
            position: index,
            isDefault: false,
            isActive: true,
            sku: ids.sku,
            barcode: ids.barcode,
            priceCents,
            stock: 0,
          },
          select: { id: true },
        });

        await tx.inventoryLevel.upsert({
          where: { variantId_locationId: { variantId: created.id, locationId: location.id } },
          update: { quantity: option.quantity },
          create: {
            variantId: created.id,
            locationId: location.id,
            quantity: option.quantity,
            reservedQuantity: 0,
          },
        });

        // Opening balance gets a ledger entry like any other movement.
        await tx.inventoryMovement.create({
          data: {
            variantId: created.id,
            locationId: location.id,
            type: "RECEIVE",
            quantity: option.quantity,
            beforeQuantity: 0,
            afterQuantity: option.quantity,
            referenceType: "SEED",
            referenceId: "enrich-catalog",
            reason: "Opening stock for a new size option",
            createdBy: "system",
          },
        });
        variantsCreated++;
      }

      for (const slug of enrichment.collections) {
        const collectionId = collectionIds.get(slug);
        if (!collectionId) continue;
        await tx.productCollection.upsert({
          where: { productId_collectionId: { productId: product.id, collectionId } },
          update: {},
          create: { productId: product.id, collectionId },
        });
      }

      console.log(
        `  SET   ${enrichment.slug}  ·  ${enrichment.variants.length} variants  ·  ${enrichment.collections.length} collections`,
      );
    }

    // ---- Reviews ----------------------------------------------------------
    // One review per (product, customer) is enforced by a unique key, so each
    // review on a product is attributed to a different customer.
    const usedPerProduct = new Map<string, number>();
    let reviewsWritten = 0;

    for (const review of REVIEWS) {
      const product = bySlug.get(review.slug);
      if (!product || customers.length === 0) continue;

      const offset = usedPerProduct.get(product.id) ?? 0;
      const user = customers[offset % customers.length];
      usedPerProduct.set(product.id, offset + 1);

      await tx.review.upsert({
        where: { productId_userId: { productId: product.id, userId: user.id } },
        update: { rating: review.rating, comment: review.comment },
        create: {
          productId: product.id,
          userId: user.id,
          rating: review.rating,
          comment: review.comment,
          isVerifiedPurchase: true,
        },
      });
      reviewsWritten++;
    }

    console.log(`\n  ${variantsCreated} new variants · ${reviewsWritten} reviews written`);
  });
}

main()
  .catch((error) => {
    console.error("\nEnrichment failed — nothing was changed:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
