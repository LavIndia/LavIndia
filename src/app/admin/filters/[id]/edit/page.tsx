import { prisma } from "@/lib/prisma";
import { FilterForm } from "@/components/admin/filters/FilterForm";
import { notFound } from "next/navigation";
import { css } from "styled-system/css";

const pageStyle = css({ display: "flex", flexDirection: "column", gap: "6" });
const titleStyle = css({ fontFamily: "display", fontSize: { base: "2xl", md: "3xl" }, fontWeight: "bold", color: "fg.default" });
const subtitleStyle = css({ marginTop: "2", fontSize: "sm", color: "fg.muted" });

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
    <div className={pageStyle}>
      <div>
        <h1 className={titleStyle}>Edit Filter</h1>
        <p className={subtitleStyle}>Update filter settings and options</p>
      </div>
      <FilterForm filter={filter} categories={categories} />
    </div>
  );
}
