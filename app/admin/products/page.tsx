import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { ProductsTable } from "@/components/admin/products/ProductsTable";
import { ProductsHeader } from "@/components/admin/products/ProductsHeader";
import { Skeleton } from "@/components/ui/skeleton";

const PAGE_SIZE = 20;

async function getProducts(searchParams: {
  search?: string;
  category?: string;
  sort?: string;
  page?: string;
}) {
  const { search, category, sort } = searchParams;
  const page = Math.max(1, parseInt(searchParams.page || "1", 10) || 1);

  const where: {
    OR?: Array<{
      name?: { contains: string; mode: "insensitive" };
      sku?: { contains: string; mode: "insensitive" };
    }>;
    categoryId?: string;
  } = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { sku: { contains: search, mode: "insensitive" } },
    ];
  }

  if (category && category !== "all") {
    where.categoryId = category;
  }

  let orderBy:
    | { createdAt: "desc" }
    | { name: "asc" | "desc" }
    | { priceCents: "asc" | "desc" }
    | { stock: "asc" | "desc" } = { createdAt: "desc" };
  if (sort === "name_asc") orderBy = { name: "asc" };
  if (sort === "name_desc") orderBy = { name: "desc" };
  if (sort === "price_asc") orderBy = { priceCents: "asc" };
  if (sort === "price_desc") orderBy = { priceCents: "desc" };
  if (sort === "stock_asc") orderBy = { stock: "asc" };
  if (sort === "stock_desc") orderBy = { stock: "desc" };

  const [products, totalCount] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy,
      include: {
        category: true,
        images: {
          where: { isPrimary: true },
          take: 1,
        },
      },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.product.count({ where }),
  ]);

  return {
    products,
    pagination: {
      page,
      pageSize: PAGE_SIZE,
      totalCount,
      totalPages: Math.max(1, Math.ceil(totalCount / PAGE_SIZE)),
    },
  };
}

async function getCategories() {
  return await prisma.category.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    category?: string;
    sort?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const [{ products, pagination }, categories] = await Promise.all([
    getProducts(params),
    getCategories(),
  ]);

  return (
    <div className="space-y-6">
      <ProductsHeader />

      <Suspense fallback={<ProductsTableSkeleton />}>
        <ProductsTable
          products={products}
          categories={categories}
          searchParams={params}
          pagination={pagination}
        />
      </Suspense>
    </div>
  );
}

function ProductsTableSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-[600px] w-full" />
    </div>
  );
}
