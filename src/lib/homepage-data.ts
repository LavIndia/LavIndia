import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { syncHeroBannersFromStorage } from "@/lib/hero-banners";
import { availabilityByProduct } from "@/modules/inventory";
import {
  HOMEPAGE_SECTIONS,
  NEW_ARRIVAL_WINDOW_DAYS,
  defaultHomePageSectionRows,
  getActiveHighlights,
} from "@/modules/marketing";

/**
 * Stock comes from the Inventory domain, never from the deprecated
 * `Product.stock` column — that counter is no longer maintained, so reading
 * it showed every product as out of stock.
 */
async function formatProducts(
  products: Array<{
    id: string;
    name: string;
    slug: string;
    description: string | null;
    priceCents: number;
    compareAtCents: number | null;
    stock: number;
    isFeatured: boolean;
    isLimitedEdition: boolean;
    images: Array<{ url: string; alt: string | null }>;
  }>,
) {
  // One batched lookup for the whole rail rather than a query per card.
  const availability = await availabilityByProduct(products.map((p) => p.id));

  return products.map((product) => ({
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    priceCents: product.priceCents,
    compareAtCents: product.compareAtCents,
    stock: availability.get(product.id)?.available ?? 0,
    isFeatured: product.isFeatured,
    isLimitedEdition: product.isLimitedEdition,
    images: product.images.map((img) => ({
      url: img.url,
      alt: img.alt || product.name,
    })),
  }));
}

export async function getPromoBanners(type: string) {
  const now = new Date();

  const where: Prisma.PromoBannerWhereInput = {
    isActive: true,
    type,
    OR: [
      { startDate: null, endDate: null },
      { startDate: { lte: now }, endDate: null },
      { startDate: null, endDate: { gte: now } },
      { startDate: { lte: now }, endDate: { gte: now } },
    ],
  };

  return prisma.promoBanner.findMany({ where, orderBy: { order: "asc" } });
}

export async function getActiveHeroBanners() {
  await syncHeroBannersFromStorage();
  return prisma.heroBanner.findMany({
    where: { active: true },
    orderBy: { order: "asc" },
  });
}

export async function getFeaturedCategories() {
  const categories = await prisma.category.findMany({
    where: { isFeatured: true },
    orderBy: { featuredOrder: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      image: true,
      isFeatured: true,
      featuredOrder: true,
      // Only needed as a display fallback for categories with no image of
      // their own — mirrors the same fallback used in the admin category
      // grid, instead of guessing a hardcoded asset path that may not exist.
      products: {
        where: { isActive: true, isPublished: true },
        take: 1,
        orderBy: { createdAt: "asc" },
        select: {
          images: {
            orderBy: [{ isPrimary: "desc" }, { position: "asc" }],
            take: 1,
            select: { url: true },
          },
        },
      },
    },
  });

  return categories.map(({ products, ...category }) => ({
    ...category,
    image: category.image ?? products[0]?.images[0]?.url ?? null,
  }));
}

export async function getBestsellers() {
  let products = await prisma.product.findMany({
    where: { isActive: true, isPublished: true, orderItems: { some: {} } },
    include: {
      images: { orderBy: { position: "asc" } },
    },
    orderBy: { orderItems: { _count: "desc" } },
  });
  // Real sales data, not a guess — the "Bestseller" tag is only ever
  // applied when a product has actually sold. A brand this level of
  // clientele expects never sees a fabricated bestseller claim.
  const hasRealSalesData = products.length > 0;

  if (products.length === 0) {
    products = await prisma.product.findMany({
      where: { isActive: true, isPublished: true },
      include: { images: { orderBy: { position: "asc" } } },
      orderBy: { createdAt: "desc" },
      take: 12,
    });
  }

  return (await formatProducts(products)).map((product) => ({
    ...product,
    isBestSeller: hasRealSalesData,
  }));
}

export async function getNewArrivals() {
  // The window is the marketing module's, not a number repeated here: the
  // admin layout screen states it to the admin in the same breath, and the
  // two must not drift.
  const since = new Date();
  since.setDate(since.getDate() - NEW_ARRIVAL_WINDOW_DAYS);

  const products = await prisma.product.findMany({
    where: { isActive: true, isPublished: true, createdAt: { gte: since } },
    include: {
      images: { orderBy: { position: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (await formatProducts(products)).map((product) => ({
    ...product,
    isNewArrival: true,
  }));
}

export async function getBudgetTiers() {
  return prisma.budgetTier.findMany({
    where: { isActive: true },
    orderBy: { order: "asc" },
  });
}

export async function getTrustBadgeSettings() {
  const settings = await prisma.siteSettings.findFirst({
    select: {
      codAvailable: true,
      customerCount: true,
      rating: true,
      supportHoursStart: true,
      supportHoursEnd: true,
    },
  });

  return (
    settings || {
      codAvailable: false,
      customerCount: "0",
      rating: "0",
      supportHoursStart: null,
      supportHoursEnd: null,
    }
  );
}

export async function getActiveDiscounts() {
  const now = new Date();

  return prisma.discount.findMany({
    where: {
      isActive: true,
      startDate: { lte: now },
      endDate: { gte: now },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getHomePageSections() {
  const rows = await prisma.homePageSection.findMany({ orderBy: { order: "asc" } });

  if (rows.length > 0) {
    // A band added to the catalogue after this store was set up has no row
    // yet, so it would never appear on the homepage and never show up on the
    // layout screen for an admin to switch on. Backfill only what is
    // missing — the common case finds nothing and costs no extra query.
    const stored = new Set(rows.map((row) => row.name));
    const missing = HOMEPAGE_SECTIONS.filter((section) => !stored.has(section.name));
    if (missing.length === 0) return rows;

    const highestOrder = rows.reduce((max, row) => Math.max(max, row.order), -1);
    await prisma.homePageSection.createMany({
      data: missing.map((section, index) => ({
        name: section.name,
        order: highestOrder + 1 + index,
        isVisible: true,
      })),
      skipDuplicates: true,
    });

    // Where the new band belongs depends on whether anyone has arranged this
    // homepage. If the stored order still matches the catalogue's, nobody
    // has, so the new band takes the position the catalogue gives it rather
    // than being stranded at the bottom. If an admin has rearranged things,
    // their order is left exactly as it is and the new band simply appends —
    // rearranging someone's homepage underneath them would be worse than
    // putting a new section in an odd place, which they can fix in one drag.
    // "Untouched" means the bands already stored still run in the order the
    // catalogue lists them. It is a subsequence test, not an index-by-index
    // one, precisely because the catalogue now contains a band the table
    // does not — comparing positions directly would call every homepage
    // rearranged the moment a section was added.
    const catalogueOrder: string[] = HOMEPAGE_SECTIONS.map((section) => section.name);
    let cursor = 0;
    const untouched = rows.every((row) => {
      const found = catalogueOrder.indexOf(row.name, cursor);
      if (found === -1) return false;
      cursor = found + 1;
      return true;
    });
    if (untouched) {
      await Promise.all(
        HOMEPAGE_SECTIONS.map((section, order) =>
          prisma.homePageSection.update({
            where: { name: section.name },
            data: { order },
          }),
        ),
      );
    }

    return prisma.homePageSection.findMany({ orderBy: { order: "asc" } });
  }

  // No admin config yet — fall back to the default order/visibility so the
  // homepage still renders correctly, and seed it so the admin table isn't
  // just empty on first visit.
  await prisma.homePageSection.createMany({
    data: defaultHomePageSectionRows(),
    skipDuplicates: true,
  });
  return prisma.homePageSection.findMany({ orderBy: { order: "asc" } });
}

// Cached as one unit — busted by revalidateTag("homepage") wherever an
// admin mutates anything this pulls together (banners, categories,
// products, budget tiers, discounts, settings, section order), plus a 60s
// revalidate window as a safety net in case a tag invalidation is missed.
export async function getHomepageData() {
  const cached = unstable_cache(
    fetchHomepageData,
    ["homepage-data"],
    { tags: ["homepage"], revalidate: 60 },
  );
  return cached();
}

async function fetchHomepageData() {
  const [
    topPromoBanners,
    freeGiftsBanners,
    heroBanners,
    featuredCategories,
    bestsellers,
    newArrivals,
    budgetTiers,
    trustBadgeSettings,
    activeDiscounts,
    highlights,
    sections,
  ] = await Promise.all([
    getPromoBanners("top_scroll"),
    getPromoBanners("free_gifts"),
    getActiveHeroBanners(),
    getFeaturedCategories(),
    getBestsellers(),
    getNewArrivals(),
    getBudgetTiers(),
    getTrustBadgeSettings(),
    getActiveDiscounts(),
    getActiveHighlights(),
    getHomePageSections(),
  ]);

  return {
    topPromoBanners,
    freeGiftsBanner: freeGiftsBanners[0] || null,
    heroBanners,
    featuredCategories,
    bestsellers,
    newArrivals,
    budgetTiers,
    trustBadgeSettings,
    activeDiscounts,
    highlights,
    sections,
  };
}
