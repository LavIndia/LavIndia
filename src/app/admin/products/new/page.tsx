import { prisma } from "@/lib/prisma";
import { ProductForm } from "@/components/admin/products/ProductForm";
import { css } from "styled-system/css";

async function getCategories() {
  return await prisma.category.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export default async function NewProductPage() {
  const categories = await getCategories();

  return (
    <div className={css({ maxWidth: "6xl", display: "flex", flexDirection: "column", gap: "6" })}>
      <div>
        <h1
          className={css({
            fontFamily: "display",
            fontSize: { base: "2xl", md: "3xl" },
            fontWeight: "bold",
            letterSpacing: "tight",
            color: "fg.default",
          })}
        >
          Add New Product
        </h1>
        <p className={css({ color: "fg.muted", marginTop: "2", fontSize: "sm" })}>
          Create a new product with images and variants
        </p>
      </div>

      <ProductForm categories={categories} />
    </div>
  );
}
