import { HeroBanner } from "@/components/home/HeroBanner";
import { HeaderSection } from "@/components/layout/HeaderSection";
import { FooterSection } from "@/components/layout/FooterSection";
import TopPromoBanner from "@/components/home/TopPromoBanner";
import { ExploreSection } from "@/components/home/ExploreSection";
import { BestsellersSection } from "@/components/home/BestsellersSection";
import { ShopUnderBudgetSection } from "@/components/home/ShopUnderBudgetSection";
import { FreeGiftsBanner } from "@/components/home/FreeGiftsBanner";
import { NewArrivalsSection } from "@/components/home/NewArrivalsSection";
import { TrustBadgesBanner } from "@/components/home/TrustBadgesBanner";
import { CouponsSection } from "@/components/home/CouponsSection";
import { getHomepageData } from "@/lib/homepage-data";
import { css } from "styled-system/css";

export const dynamic = "force-dynamic";

export default async function Home() {
  const data = await getHomepageData();

  // Homepage section order/visibility/title overrides are admin-controlled
  // (Admin > Marketing & Content > Homepage Layout) rather than hardcoded,
  // so what an admin configures there is what actually renders here.
  const visibleSections = data.sections.filter((s) => s.isVisible);

  const renderers: Record<string, () => React.ReactNode> = {
    hero: () => <HeroBanner key="hero" banners={data.heroBanners} />,
    explore: () => (
      <ExploreSection
        key="explore"
        categories={data.featuredCategories}
        title={data.sections.find((s) => s.name === "explore")?.title ?? undefined}
      />
    ),
    bestsellers: () => (
      <BestsellersSection
        key="bestsellers"
        products={data.bestsellers}
        title={data.sections.find((s) => s.name === "bestsellers")?.title ?? undefined}
      />
    ),
    budget: () => (
      <ShopUnderBudgetSection
        key="budget"
        tiers={data.budgetTiers}
        title={data.sections.find((s) => s.name === "budget")?.title ?? undefined}
      />
    ),
    free_gifts: () => <FreeGiftsBanner key="free_gifts" banner={data.freeGiftsBanner} />,
    new_arrivals: () => (
      <NewArrivalsSection
        key="new_arrivals"
        products={data.newArrivals}
        title={data.sections.find((s) => s.name === "new_arrivals")?.title ?? undefined}
      />
    ),
    trust_badges: () => (
      <TrustBadgesBanner key="trust_badges" settings={data.trustBadgeSettings} />
    ),
    coupons: () => (
      <CouponsSection
        key="coupons"
        coupons={data.activeDiscounts}
        title={data.sections.find((s) => s.name === "coupons")?.title ?? undefined}
      />
    ),
  };

  return (
    <div className={css({ minHeight: "100vh", background: "bg.canvas" })}>
      <TopPromoBanner banners={data.topPromoBanners} />
      <HeaderSection />
      {visibleSections.map((section) => renderers[section.name]?.() ?? null)}
      <FooterSection />
    </div>
  );
}
