import { prisma } from "@/lib/prisma";
import { FilterForm } from "@/components/admin/filters/FilterForm";

async function getCategories() {
  return await prisma.category.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export default async function NewFilterPage() {
  const categories = await getCategories();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Create New Filter</h1>
        <p className="mt-2 text-gray-600">
          Add a new filter like Price Range, Metal Type, or Stone Type
        </p>
      </div>
      <FilterForm categories={categories} />
    </div>
  );
}
