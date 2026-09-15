import { prisma } from "@/lib/prisma";
import { ProductForm } from "@/components/admin/products/ProductForm";

async function getCategories() {
  return await prisma.category.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export default async function NewProductPage() {
  const categories = await getCategories();

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Add New Product</h1>
        <p className="text-muted-foreground mt-2">
          Create a new product with images and variants
        </p>
      </div>

      <ProductForm categories={categories} />
    </div>
  );
}
