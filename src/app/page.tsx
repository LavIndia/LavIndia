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

export const dynamic = "force-dynamic";

export default async function Home() {
  const data = await getHomepageData();

  return (
    <div className="min-h-screen bg-white">
      <TopPromoBanner banners={data.topPromoBanners} />
      <HeaderSection />
      <HeroBanner banners={data.heroBanners} />
      <ExploreSection categories={data.featuredCategories} />
      <BestsellersSection products={data.bestsellers} />
      <ShopUnderBudgetSection tiers={data.budgetTiers} />
      <FreeGiftsBanner banner={data.freeGiftsBanner} />
      <NewArrivalsSection products={data.newArrivals} />
      <TrustBadgesBanner settings={data.trustBadgeSettings} />
      <CouponsSection coupons={data.activeDiscounts} />
      <FooterSection />
    </div>
  );
}
