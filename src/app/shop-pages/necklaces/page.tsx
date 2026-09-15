import { HeaderSection } from "@/components/layout/HeaderSection";
import { FooterSection } from "@/components/layout/FooterSection";
import { TopPromoBannerServer } from "@/components/home/TopPromoBannerServer";
import { NecklacesCollection } from "@/components/collections/necklaces";
import { getCategoryPageData } from "@/lib/category-data";

export const dynamic = "force-dynamic";

export default async function NecklacesPage() {
  const { products, pagination, filters } = await getCategoryPageData(
    "necklaces"
  );

  return (
    <div className="min-h-screen bg-white">
      <TopPromoBannerServer />
      <HeaderSection />
      <NecklacesCollection
        initialProducts={products}
        initialPagination={pagination}
        initialFilters={filters}
      />
      <FooterSection />
    </div>
  );
}
