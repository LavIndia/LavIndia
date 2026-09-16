import { prisma } from "@/lib/prisma";
import { FiltersHeader } from "@/components/admin/filters/FiltersHeader";
import { FiltersTable } from "@/components/admin/filters/FiltersTable";
import { css } from "styled-system/css";

export const dynamic = "force-dynamic";

const pageStyle = css({ display: "flex", flexDirection: "column", gap: "6" });

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
    <div className={pageStyle}>
      <FiltersHeader />
      <FiltersTable filters={filters} />
    </div>
  );
}
