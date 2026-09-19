/**
 * Builds a starter catalog in the LOCAL database from the images that exist
 * in ImageKit.
 *
 * ImageKit is read ONLY — this script issues GET requests against the media
 * library and never uploads, renames or deletes anything there.
 *
 * It is additive and idempotent: an image already attached to a product is
 * skipped, so re-running adds only what is new and never duplicates or
 * deletes. It does not touch the destructive path in prisma/seed.ts.
 *
 *     npx tsx scripts/seed-from-imagekit.ts
 */
// Must come first: populates process.env before anything reads it.
import "./load-env";
import { assertLocalDatabase } from "../prisma/guard-destructive";
import { prisma } from "../src/lib/prisma";
import { allocateIdentifiers } from "../src/modules/catalog";
import {
  CURATED_PRODUCTS,
  categoryForFolder,
  isCategoryScopedImage,
  placeholderNameFor,
  priceForCategory,
  CATEGORY_DEFINITIONS,
  type CategorySlug,
} from "./imagekit-catalog-data";

interface ImageKitFile {
  filePath: string;
  name: string;
  createdAt: string;
}

const PRODUCTS_PREFIX = "/assets/pictures/products";

async function listImageKitProductImages(): Promise<ImageKitFile[]> {
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  if (!privateKey) throw new Error("IMAGEKIT_PRIVATE_KEY is not set");

  const response = await fetch(
    "https://api.imagekit.io/v1/files?limit=1000&searchQuery=" +
      encodeURIComponent("size > 0"),
    {
      headers: {
        Authorization: `Basic ${Buffer.from(`${privateKey}:`).toString("base64")}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(`ImageKit listing failed: ${response.status}`);
  }

  const files = (await response.json()) as ImageKitFile[];
  return files
    .filter((file) => file.filePath.startsWith(`${PRODUCTS_PREFIX}/`))
    .sort((a, b) => a.filePath.localeCompare(b.filePath));
}

async function ensureCategories(): Promise<Map<CategorySlug, string>> {
  const ids = new Map<CategorySlug, string>();

  for (const definition of CATEGORY_DEFINITIONS) {
    const category = await prisma.category.upsert({
      where: { slug: definition.slug },
      update: {},
      create: {
        name: definition.name,
        slug: definition.slug,
        description: definition.description,
        isFeatured: definition.isFeatured,
        featuredOrder: definition.featuredOrder,
      },
      select: { id: true },
    });
    ids.set(definition.slug, category.id);
  }

  return ids;
}

/**
 * Creates one product from one image, together with the default sellable
 * variant, its SKU and internal barcode, and its opening stock — all in a
 * single transaction, so a half-built product can never be left behind.
 */
async function createProduct(input: {
  name: string;
  description: string;
  priceCents: number;
  compareAtCents?: number;
  categoryId: string;
  imagePath: string;
  quantity: number;
  locationId: string;
  isFeatured?: boolean;
  isLimitedEdition?: boolean;
  createdDaysAgo?: number;
}): Promise<void> {
  const baseSlug = input.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  await prisma.$transaction(async (tx) => {
    // A slug collision only happens on a re-run over renamed data; the
    // suffix keeps it unique without inventing a different product name.
    const existingSlug = await tx.product.findUnique({ where: { slug: baseSlug } });
    const slug = existingSlug ? `${baseSlug}-${Date.now().toString(36)}` : baseSlug;

    // Backdated where asked, so "New Arrival" — computed from creation date
    // over a 30-day window — actually distinguishes between products.
    const createdAt = input.createdDaysAgo
      ? new Date(Date.now() - input.createdDaysAgo * 86_400_000)
      : undefined;

    const product = await tx.product.create({
      data: {
        name: input.name,
        slug,
        description: input.description,
        priceCents: input.priceCents,
        compareAtCents: input.compareAtCents ?? null,
        categoryId: input.categoryId,
        isActive: true,
        isPublished: true,
        isFeatured: input.isFeatured ?? false,
        isLimitedEdition: input.isLimitedEdition ?? false,
        ...(createdAt ? { createdAt } : {}),
        stock: 0, // deprecated column; stock lives in the Inventory domain
      },
      select: { id: true },
    });

    await tx.productImage.create({
      data: {
        url: input.imagePath,
        alt: input.name,
        position: 0,
        isPrimary: true,
        productId: product.id,
      },
    });

    const [identifiers] = await allocateIdentifiers(tx, [
      { productSlug: slug, needsSku: true, needsBarcode: true },
    ]);

    const variant = await tx.productVariant.create({
      data: {
        name: "Default",
        isDefault: true,
        position: 0,
        isActive: true,
        productId: product.id,
        sku: identifiers.sku,
        barcode: identifiers.barcode,
        stock: 0,
      },
      select: { id: true },
    });

    await tx.inventoryLevel.create({
      data: {
        variantId: variant.id,
        locationId: input.locationId,
        quantity: input.quantity,
        reservedQuantity: 0,
      },
    });

    // The opening balance gets a ledger entry like any other movement, so
    // no stock in this system appears from nowhere.
    await tx.inventoryMovement.create({
      data: {
        variantId: variant.id,
        locationId: input.locationId,
        type: "RECEIVE",
        quantity: input.quantity,
        beforeQuantity: 0,
        afterQuantity: input.quantity,
        referenceType: "SEED",
        referenceId: "seed-from-imagekit",
        reason: "Opening stock for starter catalog",
        createdBy: "system",
      },
    });
  });
}

async function main(): Promise<void> {
  assertLocalDatabase("scripts/seed-from-imagekit.ts");

  const location = await prisma.inventoryLocation.findFirst({
    where: { isDefault: true },
    select: { id: true, name: true },
  });
  if (!location) throw new Error("No default inventory location. Run migrations first.");

  const files = await listImageKitProductImages();
  console.log(`\nImageKit: ${files.length} product images found (read-only).`);

  // Anything already attached to a product is left alone — this is what
  // makes re-running safe.
  const taken = new Set(
    (await prisma.productImage.findMany({ select: { url: true } })).map((i) => i.url),
  );

  const categoryIds = await ensureCategories();
  console.log(`Categories ready: ${[...categoryIds.keys()].join(", ")}\n`);

  let created = 0;
  let skippedExisting = 0;
  let skippedFlagged = 0;
  let skippedLoose = 0;
  const perCategoryCount = new Map<CategorySlug, number>();

  for (const file of files) {
    if (taken.has(file.filePath)) {
      skippedExisting++;
      continue;
    }

    // A file loose in the products root is skipped, not guessed at. Its
    // folder is the only statement of which category it belongs to, and
    // filing it by assumption would create a product in the wrong place that
    // looks entirely correct.
    if (!isCategoryScopedImage(file.filePath)) {
      console.log(`  LOOSE ${file.name}
        not in a category folder — ignored`);
      skippedLoose++;
      continue;
    }

    const curated = CURATED_PRODUCTS[file.name];

    // Some images cannot be listed as LavIndia products — see the notes in
    // imagekit-catalog-data.ts. They are reported, never silently dropped.
    if (curated?.exclude) {
      console.log(`  SKIP  ${file.name}\n        reason: ${curated.excludeReason}`);
      skippedFlagged++;
      continue;
    }

    const categorySlug = categoryForFolder(file.filePath)!;
    const categoryId = categoryIds.get(categorySlug);
    if (!categoryId) continue;

    const index = (perCategoryCount.get(categorySlug) ?? 0) + 1;
    perCategoryCount.set(categorySlug, index);

    const name = curated?.name ?? placeholderNameFor(categorySlug, index);
    const description = curated?.description ?? "";
    const priceCents = curated?.priceCents ?? priceForCategory(categorySlug, index);
    const quantity = curated?.quantity ?? 4 + ((index * 3) % 12);

    await createProduct({
      name,
      description,
      priceCents,
      compareAtCents: curated?.compareAtCents,
      categoryId,
      imagePath: file.filePath,
      quantity,
      locationId: location.id,
      isFeatured: curated?.isFeatured,
      isLimitedEdition: curated?.isLimitedEdition,
      createdDaysAgo: curated?.createdDaysAgo,
    });

    created++;
    console.log(
      `  ADD   ${name}  ·  ${categorySlug}  ·  Rs ${(priceCents / 100).toLocaleString("en-IN")}  ·  qty ${quantity}${curated ? "" : "   (placeholder name — review)"}`,
    );
  }

  console.log(
    `\nCreated ${created} products · skipped ${skippedExisting} already-linked images · ${skippedFlagged} flagged\n`,
  );
}

main()
  .catch((error) => {
    console.error("\nSeeding from ImageKit failed:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
