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
  return prisma.category.findMany({
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
    },
  });
}

export async function getBestsellers() {
  let products = await prisma.product.findMany({
    where: { isActive: true },
    include: {
      images: { orderBy: { position: "asc" } },
    },
    orderBy: { orderItems: { _count: "desc" } },
  });

  if (products.length === 0) {
    products = await prisma.product.findMany({
      where: { isActive: true },
      include: { images: { orderBy: { position: "asc" } } },
      orderBy: { createdAt: "desc" },
      take: 12,
    });
  }

  return formatProducts(products);
}

export async function getNewArrivals() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const products = await prisma.product.findMany({
    where: { isActive: true, createdAt: { gte: thirtyDaysAgo } },
    include: {
      images: { orderBy: { position: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });

  return formatProducts(products);
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

export async function getHomepageData() {
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
