import { HeaderSection } from "@/components/layout/HeaderSection";
import { FooterSection } from "@/components/layout/FooterSection";
import { TopPromoBannerServer } from "@/components/home/TopPromoBannerServer";
import { NecklacesCollection } from "@/components/collections/necklaces";
import { getCategoryPageData } from "@/lib/category-data";
import { css } from "styled-system/css";

export const dynamic = "force-dynamic";

const pageStyle = css({ minHeight: "100vh", background: "bg.canvas" });

export default async function NecklacesPage() {
  const { products, pagination, filters } = await getCategoryPageData(
    "necklaces"
  );

  return (
    <div className={pageStyle}>
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
