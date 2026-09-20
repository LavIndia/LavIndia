import type { Metadata } from "next";
import { HeaderSection } from "@/components/layout/HeaderSection";
import { FooterSection } from "@/components/layout/FooterSection";
import { TopPromoBannerServer } from "@/components/home/TopPromoBannerServer";
import { CategoryCollection } from "@/components/collections/CategoryCollection";
import { getAllJewelleryPageData } from "@/lib/category-data";
import { ALL_CATEGORIES } from "@/lib/catalog-scope";
import { css } from "styled-system/css";

/**
 * The shop-everything listing, served at /shop.
 *
 * It reuses the same collection component every category page uses, so the
 * filters, sorting and infinite scroll behave identically here — the only
 * difference is that the listing is not scoped to one category. The hero
 * banner's default destination points here, which is why it exists.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Shop All Jewellery",
  description:
    "Browse every piece in the collection — earrings, necklaces and rings, finished by hand in small runs.",
};

const pageStyle = css({ minHeight: "100vh", background: "bg.canvas" });

export default async function ShopAllPage() {
  const { products, pagination, filters } = await getAllJewelleryPageData();

  return (
    <div className={pageStyle}>
      <TopPromoBannerServer />
      <HeaderSection />
      <CategoryCollection
        categorySlug={ALL_CATEGORIES}
        categoryName="All Jewellery"
        categoryDescription="Every piece in the collection, finished by hand in small runs."
        initialProducts={products}
        initialPagination={pagination}
        initialFilters={filters}
      />
      <FooterSection />
    </div>
  );
}
