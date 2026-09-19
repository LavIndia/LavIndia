import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { availabilityByProduct } from "@/modules/inventory";
import { ProductsTable } from "@/components/admin/products/ProductsTable";
import { ProductsHeader } from "@/components/admin/products/ProductsHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { css } from "styled-system/css";

const PAGE_SIZE = 20;

async function getProducts(searchParams: {
  search?: string;
  category?: string;
  sort?: string;
  page?: string;
  group?: string;
}) {
  const { search, category, sort } = searchParams;
  const page = Math.max(1, parseInt(searchParams.page || "1", 10) || 1);
  // Grouped-by-category view needs the whole filtered set at once — a
  // page-sliced result would split a category's products across pages.
  const grouped = searchParams.group === "1";

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
    | { priceCents: "asc" | "desc" } = { createdAt: "desc" };
  if (sort === "name_asc") orderBy = { name: "asc" };
  if (sort === "name_desc") orderBy = { name: "desc" };
  if (sort === "price_asc") orderBy = { priceCents: "asc" };
  if (sort === "price_desc") orderBy = { priceCents: "desc" };
  // Stock is not a product column any more, so it cannot be an ORDER BY here.
  // It is applied after availability is resolved, below.
  const sortByStock =
    sort === "stock_asc" ? "asc" : sort === "stock_desc" ? "desc" : null;

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
      ...(grouped ? {} : { skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    }),
    prisma.product.count({ where }),
  ]);

  // Stock comes from the Inventory domain. The deprecated Product.stock
  // column is no longer maintained, so reading it showed every row as Out.
  const availability = await availabilityByProduct(products.map((p) => p.id));
  const withStock = products.map((product) => ({
    ...product,
    stock: availability.get(product.id)?.available ?? 0,
  }));
  if (sortByStock) {
    withStock.sort((a, b) =>
      sortByStock === "asc" ? a.stock - b.stock : b.stock - a.stock,
    );
  }

  return {
    products: withStock,
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
    group?: string;
  }>;
}) {
  const params = await searchParams;
  const [{ products, pagination }, categories] = await Promise.all([
    getProducts(params),
    getCategories(),
  ]);

  return (
    <div className={css({ display: "flex", flexDirection: "column", gap: "6" })}>
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
    <div className={css({ display: "flex", flexDirection: "column", gap: "4" })}>
      <Skeleton className={css({ height: "10", width: "full" })} />
      <Skeleton className={css({ height: "600px", width: "full" })} />
    </div>
  );
}
