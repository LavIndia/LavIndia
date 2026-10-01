import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { listAdminProducts } from "@/lib/admin-product-list";
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
  const page = Math.max(1, parseInt(searchParams.page || "1", 10) || 1);
  // Grouped-by-category view needs the whole filtered set at once — a
  // page-sliced result would split a category's products across pages.
  const grouped = searchParams.group === "1";

  // Search (including variant SKUs), sort (stock ranked across every row,
  // then paged) and stock figures are shared with the category dialog.
  const { products, totalCount } = await listAdminProducts(
    {
      search: searchParams.search,
      categoryId: searchParams.category,
      sort: searchParams.sort,
      page: grouped ? null : page,
      pageSize: PAGE_SIZE,
    },
    (args) =>
      prisma.product.findMany({
        ...args,
        include: {
          category: true,
          images: { where: { isPrimary: true }, take: 1 },
          // Counted in the same query, so the Delete dialog can say up front
          // whether the piece has been sold.
          _count: { select: { orderItems: true } },
        },
      }),
  );

  return {
    products: products.map(({ _count, ...product }) => ({
      ...product,
      orderLineCount: _count.orderItems,
    })),
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
