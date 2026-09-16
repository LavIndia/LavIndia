import { prisma } from "@/lib/prisma";
import { ProductForm } from "@/components/admin/products/ProductForm";
import { notFound } from "next/navigation";
import { css } from "styled-system/css";

async function getProduct(id: string) {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      images: {
        orderBy: { position: "asc" },
      },
      variants: true,
    },
  });

  return product;
}

async function getCategories() {
  return await prisma.category.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [product, categories] = await Promise.all([
    getProduct(id),
    getCategories(),
  ]);

  if (!product) {
    notFound();
  }

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
          Edit Product
        </h1>
        <p className={css({ color: "fg.muted", marginTop: "2", fontSize: "sm" })}>
          Update product details, images, and variants
        </p>
      </div>

      <ProductForm product={product} categories={categories} />
    </div>
  );
}
