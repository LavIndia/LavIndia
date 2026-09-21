import { prisma } from "@/lib/prisma";
import { getHomepageData } from "@/lib/homepage-data";
import { HomePageLayoutTable } from "@/components/admin/homepage-layout/HomePageLayoutTable";
import { HomePageLayoutHeader } from "@/components/admin/homepage-layout/HomePageLayoutHeader";
import type { SectionCounts } from "@/components/admin/homepage-layout/homepage-layout-types";
import { css } from "styled-system/css";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Counts read from the homepage's own cached payload rather than from fresh
 * queries: it is the same data the storefront renders, so the number an
 * admin sees here is by construction the number of cards the band will show,
 * and the screen costs no additional database round trips.
 */
async function getSectionCounts(): Promise<SectionCounts> {
  const data = await getHomepageData();
  return {
    hero: { value: data.heroBanners.length, noun: "banner", nounPlural: "banners" },
    explore: {
      value: data.featuredCategories.length,
      noun: "category",
      nounPlural: "categories",
    },
    bestsellers: { value: data.bestsellers.length, noun: "product", nounPlural: "products" },
    budget: { value: data.budgetTiers.length, noun: "tier", nounPlural: "tiers" },
    free_gifts: { value: data.freeGiftsBanner ? 1 : 0, noun: "banner", nounPlural: "banners" },
    new_arrivals: { value: data.newArrivals.length, noun: "product", nounPlural: "products" },
    coupons: { value: data.activeDiscounts.length, noun: "coupon", nounPlural: "coupons" },
  };
}

export default async function HomePageLayoutPage() {
  const [sections, counts] = await Promise.all([
    prisma.homePageSection.findMany({ orderBy: { order: "asc" } }),
    getSectionCounts(),
  ]);

  return (
    <div className={css({ display: "flex", flexDirection: "column", gap: "6" })}>
      <HomePageLayoutHeader />
      <HomePageLayoutTable sections={sections} counts={counts} />
    </div>
  );
}
