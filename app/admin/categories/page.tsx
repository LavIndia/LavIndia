import { prisma } from "@/lib/prisma";
import { CategoriesHeader } from "@/components/admin/categories/CategoriesHeader";
import { CategoriesTable } from "@/components/admin/categories/CategoriesTable";

async function getCategories() {
  const categories = await prisma.category.findMany({
    include: {
      _count: {
        select: { products: true },
      },
    },
    orderBy: { name: "asc" },
  });

  return categories;
}

export default async function CategoriesPage() {
  const categories = await getCategories();

  return (
    <div className="space-y-6">
      <CategoriesHeader />
      <CategoriesTable categories={categories} />
    </div>
  );
}
