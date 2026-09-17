import { HeaderSection } from "@/components/layout/HeaderSection";
import { FooterSection } from "@/components/layout/FooterSection";
import { TopPromoBannerServer } from "@/components/home/TopPromoBannerServer";
import { EarringsCollection } from "@/components/collections/earrings";
import { getCategoryPageData } from "@/lib/category-data";
import { css } from "styled-system/css";

export const dynamic = "force-dynamic";

const pageStyle = css({ minHeight: "100vh", background: "bg.canvas" });

export default async function EarringsPage() {
  const { products, pagination, filters } = await getCategoryPageData(
    "earrings"
  );

  return (
    <div className={pageStyle}>
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
