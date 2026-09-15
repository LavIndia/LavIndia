import { HeaderSection } from "@/components/layout/HeaderSection";
import { FooterSection } from "@/components/layout/FooterSection";
import { TopPromoBannerServer } from "@/components/home/TopPromoBannerServer";
import { RingsCollection } from "@/components/collections/rings";
import { getCategoryPageData } from "@/lib/category-data";

export const dynamic = "force-dynamic";

export default async function RingsPage() {
  const { products, pagination, filters } = await getCategoryPageData("rings");

  return (
    <div className="min-h-screen bg-white">
      <TopPromoBannerServer />
      <HeaderSection />
      <RingsCollection
        initialProducts={products}
        initialPagination={pagination}
        initialFilters={filters}
      />
      <FooterSection />
    </div>
  );
}
