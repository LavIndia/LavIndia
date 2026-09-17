import { HeaderSection } from "@/components/layout/HeaderSection";
import { FooterSection } from "@/components/layout/FooterSection";
import { BreadcrumbNavigation } from "@/components/layout/BreadcrumbNavigation";
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

  if (!category) {
    return (
      <div className={pageStyle}>
        <HeaderSection />
        <main className={css({ paddingBlock: "8" })}>
          <div
            className={css({
              maxWidth: "7xl",
              marginInline: "auto",
              paddingInline: "4",
              textAlign: "center",
            })}
          >
            <div className={css({ marginBottom: "6", textAlign: "left" })}>
              <BreadcrumbNavigation />
            </div>
            <h1
              className={css({
                fontFamily: "display",
                fontSize: "3xl",
                fontWeight: "bold",
                marginBottom: "4",
                color: "fg.default",
              })}
            >
              Category Not Found
            </h1>
            <p className={css({ color: "fg.muted" })}>
              The category you&apos;re looking for doesn&apos;t exist.
            </p>
          </div>
        </main>
        <FooterSection />
      </div>
    );
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
