import { prisma } from "@/lib/prisma";
import { FiltersHeader } from "@/components/admin/filters/FiltersHeader";
import { FiltersTable } from "@/components/admin/filters/FiltersTable";

export const dynamic = "force-dynamic";

async function getFilters() {
  const filters = await prisma.filter.findMany({
    include: {
      _count: {
        select: { options: true, categories: true },
      },
    },
    orderBy: { order: "asc" },
  });

  return filters;
}

export default async function FiltersPage() {
  const filters = await getFilters();

  return (
    <div className="space-y-6">
      <FiltersHeader />
      <FiltersTable filters={filters} />
    </div>
  );
}
