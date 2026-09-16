import { prisma } from "@/lib/prisma";
import { FilterForm } from "@/components/admin/filters/FilterForm";
import { css } from "styled-system/css";

const pageStyle = css({ display: "flex", flexDirection: "column", gap: "6" });
const titleStyle = css({ fontFamily: "display", fontSize: { base: "2xl", md: "3xl" }, fontWeight: "bold", color: "fg.default" });
const subtitleStyle = css({ marginTop: "2", fontSize: "sm", color: "fg.muted" });

async function getCategories() {
  return await prisma.category.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export default async function NewFilterPage() {
  const categories = await getCategories();

  return (
    <div className={pageStyle}>
      <div>
        <h1 className={titleStyle}>Create New Filter</h1>
        <p className={subtitleStyle}>
          Add a new filter like Price Range, Metal Type, or Stone Type
        </p>
      </div>
      <FilterForm categories={categories} />
    </div>
  );
}
