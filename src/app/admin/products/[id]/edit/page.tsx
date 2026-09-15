import { prisma } from "@/lib/prisma";
import { ProductForm } from "@/components/admin/products/ProductForm";
import { notFound } from "next/navigation";

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
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Edit Product</h1>
        <p className="text-muted-foreground mt-2">
          Update product details, images, and variants
        </p>
      </div>

      <ProductForm product={product} categories={categories} />
    </div>
  );
}
