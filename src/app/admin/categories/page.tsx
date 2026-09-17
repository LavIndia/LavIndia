import { prisma } from "@/lib/prisma";
import { CategoriesHeader } from "@/components/admin/categories/CategoriesHeader";
import { CategoryCards } from "@/components/admin/categories/CategoryCards";
import { css } from "styled-system/css";

async function getCategories() {
  const categories = await prisma.category.findMany({
    include: {
      _count: {
        select: { products: true },
      },
      // Only needed as a display fallback for categories with no image of
      // their own — see the `image` mapping below.
      products: {
        take: 1,
        orderBy: { createdAt: "asc" },
        select: {
          images: {
            orderBy: [{ isPrimary: "desc" }, { position: "asc" }],
            take: 1,
            select: { url: true },
          },
        },
      },
    },
    orderBy: [{ featuredOrder: "asc" }, { name: "asc" }],
  });

  return categories.map(({ products, ...category }) => ({
    ...category,
    image: category.image ?? products[0]?.images[0]?.url ?? null,
  }));
}

export default async function CategoriesPage() {
  const categories = await getCategories();

  return (
    <div className={css({ display: "flex", flexDirection: "column", gap: "6" })}>
      <CategoriesHeader nextOrder={categories.length} />
      <CategoryCards categories={categories} />
    </div>
  );
}
