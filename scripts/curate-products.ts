/**
 * Applies real catalog copy to products that were seeded with placeholder
 * names, in ONE pass.
 *
 * Every product below was written after actually looking at its photograph,
 * so the names and descriptions describe the piece rather than dressing up a
 * filename. Where two images turned out to be the same piece — a studio shot
 * and an on-model shot — they are merged into a single product with a proper
 * gallery, which is what the seeder could not know when it worked one image
 * at a time.
 *
 * The whole curation runs inside a single transaction: either the catalog
 * ends up fully corrected, or nothing changes.
 *
 *     npx tsx scripts/curate-products.ts
 */
// Must come first: populates process.env before anything reads it.
import "./load-env";
import { assertLocalDatabase } from "../prisma/guard-destructive";
import { prisma } from "../src/lib/prisma";
import { formatSku } from "../src/modules/catalog";

interface CuratedProduct {
  /** Filename of the image this product is identified by. */
  primaryImage: string;
  /** Further images of the SAME piece, currently attached to their own products. */
  alsoImages?: string[];
  name: string;
  description: string;
  priceCents: number;
  compareAtCents?: number;
}

const CURATION: CuratedProduct[] = [
  {
    primaryImage: "Untitled_design_-_2025-07-29T171446.268.jpg.jpeg",
    // The second file is the same necklace worn, not a different product.
    alsoImages: ["Untitled_design_-_2025-07-29T171452.690.jpg.jpeg"],
    name: "Onyx Tablet Pendant Necklace",
    description:
      "A slim gold-tone box chain carrying a black enamel tablet in a softly bevelled octagonal frame. The pendant is small enough to wear under a collar and dark enough to read as a full stop against pale silk. Sits just below the collarbone.",
    priceCents: 189900,
    compareAtCents: 249900,
  },
  {
    primaryImage: "Untitled_design_-_2025-07-29T181411.242.jpg.jpeg",
    name: "Molten Drop Collar",
    description:
      "A flat snake chain drawn into a close collar, interrupted by a single smooth drop of gold that looks poured rather than set. There is no stone and no pattern — the whole piece rests on the curve and the shine. Best worn alone, against a bare neckline.",
    priceCents: 249900,
  },
  {
    primaryImage: "Untitled_design_-_2025-08-01T124009.066.jpg.jpeg",
    name: "Celestial Sun and Moon Pendant",
    description:
      "A silver-tone pendant where a pavé sun sits behind a crescent moon set with pale blue opal. The rays are cut individually, so the piece throws light in every direction rather than glinting in one. Comes on a fine cable chain.",
    priceCents: 219900,
  },
  {
    primaryImage: "Untitled_design_-_2025-08-04T141747.058.jpg.jpeg",
    name: "Layered Butterfly Necklace",
    description:
      "Two fine silver-tone chains at different lengths, each holding a butterfly set with clear stones — one small, one a touch larger. The layering is built in, so it falls correctly without the fuss of pairing two separate necklaces.",
    priceCents: 169900,
  },
  {
    primaryImage: "Untitled_design_-_2025-08-04T143904.265.jpg.jpeg",
    name: "Puffed Heart Station Necklace",
    description:
      "A gold-tone chain punctuated with tiny beads at intervals, finishing in a full, hand-smoothed heart. The heart is domed rather than flat, which gives it weight on the skin and keeps it from looking like a charm.",
    priceCents: 199900,
  },
  {
    primaryImage: "1_1_4c720205-d49a-4e6b-8a29-b80b95829124.jpg.jpeg",
    name: "Petite Charm Pendant Necklace",
    description:
      "A fine silver-tone satellite chain carrying one small crystal-set charm — a ginkgo leaf, a flower, a heart, a circle. Sold as a single pendant; the photograph shows the range the charm is chosen from. Short enough to layer under a longer chain.",
    priceCents: 129900,
  },
  {
    primaryImage: "16_a94e1fb4-7dbc-4a67-b64f-1366fe0ec967.jpg.jpeg",
    name: "Enamel Butterfly Choker",
    description:
      "A gold-tone chain hung with small enamel butterflies in green, blue, pink and amber, alternating with clear crystal drops. Sits high on the neck and moves constantly, which is most of its charm.",
    priceCents: 179900,
    compareAtCents: 219900,
  },
  {
    primaryImage: "4_e4bc3053-d26d-450e-bcba-62b1a27c908f.jpg.jpeg",
    name: "Crystal Motif Pendant Necklace",
    description:
      "A silver-tone rope chain finished with a crystal-set motif — a heart, a swan, a bear, a bow. One pendant per necklace, chosen from the family shown. Bright enough for evening, small enough for every day.",
    priceCents: 149900,
  },
  {
    primaryImage: "7_b4c08463-a3f9-48c3-aaa0-c8ba1b8e08ff.jpg.jpeg",
    name: "Emerald Cut Crystal Pendant",
    description:
      "A gold-tone snake chain with an emerald-cut crystal set in a plain bezel. Available in ruby red, clear, rose, onyx black and smoke grey — the stone is what changes, the setting stays the same.",
    priceCents: 199900,
  },
  {
    primaryImage: "Don_tLeafMeHoopsEarrings-2024-07-06T141030.820_ca1d4000-f119-4c3e-bc58-33b11cb47fd0.jpg.jpeg",
    name: "Mystic Heart Halo Pendant",
    description:
      "A large heart-cut stone graded from violet through to sea blue, ringed by a pavé halo on a fine silver-tone chain. The colour shifts with the light, so it never quite reads the same twice.",
    priceCents: 249900,
    compareAtCents: 299900,
  },
];

/** Locates the product a given image file currently belongs to. */
async function productIdForImage(filename: string): Promise<{ productId: string; imageId: string } | null> {
  const image = await prisma.productImage.findFirst({
    where: { url: { endsWith: filename } },
    select: { id: true, productId: true },
  });
  return image ? { productId: image.productId, imageId: image.id } : null;
}

async function main(): Promise<void> {
  assertLocalDatabase("scripts/curate-products.ts");

  // Everything is resolved BEFORE the write, so the transaction below is a
  // single uninterrupted pass rather than a read-write-read cycle.
  const plan: {
    curated: CuratedProduct;
    productId: string;
    mergeFrom: { productId: string; imageId: string }[];
  }[] = [];

  for (const curated of CURATION) {
    const primary = await productIdForImage(curated.primaryImage);
    if (!primary) {
      console.log(`  MISS  ${curated.name} — primary image not found in the database`);
      continue;
    }

    const mergeFrom: { productId: string; imageId: string }[] = [];
    for (const filename of curated.alsoImages ?? []) {
      const extra = await productIdForImage(filename);
      if (extra && extra.productId !== primary.productId) mergeFrom.push(extra);
    }

    plan.push({ curated, productId: primary.productId, mergeFrom });
  }

  await prisma.$transaction(async (tx) => {
    for (const { curated, productId, mergeFrom } of plan) {
      // The slug and SKU were generated from the placeholder name, so they
      // still read "untitled". Both are human-facing — a SKU gets read aloud
      // across a counter — so they are corrected here too, in the same pass.
      const slug = curated.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

      await tx.product.update({
        where: { id: productId },
        data: {
          name: curated.name,
          slug,
          description: curated.description,
          priceCents: curated.priceCents,
          compareAtCents: curated.compareAtCents ?? null,
          isPublished: true,
          isActive: true,
        },
      });

      // Re-issue the SKU from the corrected slug, keeping the sequence number
      // the variant was already allocated so the identifier stays stable.
      const variants = await tx.productVariant.findMany({
        where: { productId },
        select: { id: true, sku: true },
      });
      for (const variant of variants) {
        const sequence = Number(variant.sku?.split("-").pop() ?? 0);
        if (!sequence) continue;
        await tx.productVariant.update({
          where: { id: variant.id },
          data: { sku: formatSku(slug, sequence) },
        });
      }

      // Pull duplicate-product images across into the real product's gallery,
      // then remove the now-empty shells they were attached to.
      let position = 1;
      for (const extra of mergeFrom) {
        await tx.productImage.update({
          where: { id: extra.imageId },
          data: { productId, isPrimary: false, position: position++, alt: curated.name },
        });
        // Cascades to that shell's variant, inventory level and movements.
        await tx.product.delete({ where: { id: extra.productId } });
      }

      await tx.productImage.updateMany({
        where: { productId, isPrimary: true },
        data: { alt: curated.name },
      });

      console.log(
        `  SET   ${curated.name}  ·  Rs ${(curated.priceCents / 100).toLocaleString("en-IN")}` +
          (mergeFrom.length ? `  (+${mergeFrom.length} image merged)` : ""),
      );
    }
  });

  const [products, published, images] = await Promise.all([
    prisma.product.count(),
    prisma.product.count({ where: { isPublished: true } }),
    prisma.productImage.count(),
  ]);
  console.log(`\n${plan.length} products curated · ${products} total · ${published} published · ${images} images\n`);
}

main()
  .catch((error) => {
    console.error("\nCuration failed — nothing was changed:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
