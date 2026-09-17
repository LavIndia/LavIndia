import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { syncHeroBannersFromStorage } from "@/lib/hero-banners";

function formatProducts(
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
  return products.map((product) => ({
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    priceCents: product.priceCents,
    compareAtCents: product.compareAtCents,
    stock: product.stock,
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

  return formatProducts(products).map((product) => ({
    ...product,
    isBestSeller: hasRealSalesData,
  }));
}

export async function getNewArrivals() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const products = await prisma.product.findMany({
    where: { isActive: true, isPublished: true, createdAt: { gte: thirtyDaysAgo } },
    include: {
      images: { orderBy: { position: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });

  return formatProducts(products).map((product) => ({
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

const DEFAULT_SECTIONS: Array<{ name: string; order: number; isVisible: boolean }> = [
  { name: "hero", order: 0, isVisible: true },
  { name: "explore", order: 1, isVisible: true },
  { name: "bestsellers", order: 2, isVisible: true },
  { name: "budget", order: 3, isVisible: true },
  { name: "free_gifts", order: 4, isVisible: true },
  { name: "new_arrivals", order: 5, isVisible: true },
  { name: "trust_badges", order: 6, isVisible: true },
  { name: "coupons", order: 7, isVisible: true },
];

export async function getHomePageSections() {
  const rows = await prisma.homePageSection.findMany({ orderBy: { order: "asc" } });
  if (rows.length > 0) return rows;

  // No admin config yet — fall back to the default order/visibility so the
  // homepage still renders correctly, and seed it so the admin table isn't
  // just empty on first visit.
  await prisma.homePageSection.createMany({
    data: DEFAULT_SECTIONS,
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
    sections,
  };
}
