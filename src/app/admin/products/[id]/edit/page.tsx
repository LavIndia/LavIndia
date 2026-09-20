import { prisma } from "@/lib/prisma";
import { onHandByVariant } from "@/modules/inventory";
import { ProductForm } from "@/components/admin/products/ProductForm";
import type { StockByVariant } from "@/components/admin/products/product-form-types";
import { notFound } from "next/navigation";
import { css } from "styled-system/css";

async function getProduct(id: string) {
  return prisma.product.findUnique({
    where: { id },
    include: {
      images: { orderBy: { position: "asc" } },
      variants: { orderBy: { position: "asc" } },
    },
  });
}

async function getCategories() {
  return prisma.category.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

/**
 * On-hand stock per variant, read through the Inventory module so the form
 * can show it beside each row. Read-only here: stock moves by receiving or
 * adjusting in Inventory, never by editing a product.
 */
async function getStockByVariant(variantIds: string[]): Promise<StockByVariant> {
  const onHand = await onHandByVariant(variantIds);
  return Object.fromEntries(
    [...onHand].map(([id, level]) => [id, { quantity: level.quantity, reserved: level.reserved }]),
  );
}

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [product, categories] = await Promise.all([getProduct(id), getCategories()]);

  if (!product) {
    notFound();
  }

  const stockByVariant = await getStockByVariant(product.variants.map((v) => v.id));

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

      <ProductForm product={product} categories={categories} stockByVariant={stockByVariant} />
    </div>
  );
}
