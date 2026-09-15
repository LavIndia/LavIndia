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
  };
}
