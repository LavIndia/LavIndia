import { HeaderSection } from "@/components/layout/HeaderSection";
import { FooterSection } from "@/components/layout/FooterSection";
import { TopPromoBannerServer } from "@/components/home/TopPromoBannerServer";
import { EarringsCollection } from "@/components/collections/earrings";
import { getCategoryPageData } from "@/lib/category-data";

export const dynamic = "force-dynamic";

export default async function EarringsPage() {
  const { products, pagination, filters } = await getCategoryPageData(
    "earrings"
  );

  return (
    <div className="min-h-screen bg-white">
      <TopPromoBannerServer />
      <HeaderSection />
      <EarringsCollection
        initialProducts={products}
        initialPagination={pagination}
        initialFilters={filters}
      />
      <FooterSection />
    </div>
  );
}
