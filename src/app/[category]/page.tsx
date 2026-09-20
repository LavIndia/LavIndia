import { notFound } from "next/navigation";
import { HeaderSection } from "@/components/layout/HeaderSection";
import { FooterSection } from "@/components/layout/FooterSection";
import { TopPromoBannerServer } from "@/components/home/TopPromoBannerServer";
import { CategoryCollection } from "@/components/collections/CategoryCollection";
import { getCategoryPageData } from "@/lib/category-data";
import { css } from "styled-system/css";

export const dynamic = "force-dynamic";

const pageStyle = css({ minHeight: "100vh", background: "bg.canvas" });

// One shared template for every category — old (earrings/necklaces/rings)
// and new (whatever an admin creates next) — so a freshly-created category
// gets the same filters/sort/pagination experience without a developer
// having to hand-build another page for it.
export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category: categorySlug } = await params;
  const { category, products, pagination, filters } =
    await getCategoryPageData(categorySlug);

  // An unknown slug is a 404, not a page. Answering with a body and a 200
  // made every mistyped URL look like a real page to search engines.
  if (!category) {
    notFound();
  }

  return (
    <div className={pageStyle}>
      <TopPromoBannerServer />
      <HeaderSection />
      <CategoryCollection
        categorySlug={category.slug}
        categoryName={category.name}
        categoryDescription={category.description}
        initialProducts={products}
        initialPagination={pagination}
        initialFilters={filters}
      />
      <FooterSection />
    </div>
  );
}
