import { HeaderSection } from "@/components/layout/HeaderSection";
import { FooterSection } from "@/components/layout/FooterSection";
import { TopPromoBannerServer } from "@/components/home/TopPromoBannerServer";
import { RingsCollection } from "@/components/collections/rings";
import { getCategoryPageData } from "@/lib/category-data";
import { css } from "styled-system/css";

export const dynamic = "force-dynamic";

const pageStyle = css({ minHeight: "100vh", background: "bg.canvas" });

export default async function RingsPage() {
  const { products, pagination, filters } = await getCategoryPageData("rings");

  return (
    <div className={pageStyle}>
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
