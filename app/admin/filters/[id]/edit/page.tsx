import { prisma } from "@/lib/prisma";
import { FilterForm } from "@/components/admin/filters/FilterForm";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ id: string }>;
}

async function getFilter(id: string) {
  const filter = await prisma.filter.findUnique({
    where: { id },
    include: {
      options: {
        orderBy: { order: "asc" },
      },
      categories: {
        include: { category: true },
      },
    },
  });

  if (!filter) {
    notFound();
  }

  return filter;
}

async function getCategories() {
  return await prisma.category.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export default async function EditFilterPage(props: Props) {
  const params = await props.params;
  const filter = await getFilter(params.id);
  const categories = await getCategories();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Edit Filter</h1>
        <p className="mt-2 text-gray-600">Update filter settings and options</p>
      </div>
      <FilterForm filter={filter} categories={categories} />
    </div>
  );
}
