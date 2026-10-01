/**
 * The admin's product list query: search, category filter, sort and paging,
 * shared by Admin › Products and the category products dialog so the two can
 * never disagree about what a search finds or what order "stock" means.
 *
 *   - Search matches the product's name, its own SKU, and the SKU of any of
 *     its variants — a SKU identifies a variant, so that is usually the one
 *     an admin has in hand.
 *   - Stock is not a product column; it lives in Inventory. A stock sort is
 *     therefore ranked across every matching product first and paged after,
 *     rather than reordering only the rows already on the page.
 *
 * The caller supplies how to load a page of products (its own `include`), so
 * this decides which rows and in what order without fixing their shape.
 */
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { availabilityByProduct, rankProductsByAvailability } from "@/modules/inventory";

export interface AdminProductListQuery {
  search?: string | null;
  categoryId?: string | null;
  sort?: string | null;
  /** One-based. Null returns every matching product. */
  page: number | null;
  pageSize: number;
}

export interface ProductLoadArgs {
  where: Prisma.ProductWhereInput;
  orderBy?: Prisma.ProductOrderByWithRelationInput;
  skip?: number;
  take?: number;
}

const ORDER_BY: Record<string, Prisma.ProductOrderByWithRelationInput> = {
  name_asc: { name: "asc" },
  name_desc: { name: "desc" },
  price_asc: { priceCents: "asc" },
  price_desc: { priceCents: "desc" },
};

export function adminProductWhere(
  search?: string | null,
  categoryId?: string | null,
): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = {};
  const term = search?.trim();
  if (term) {
    where.OR = [
      { name: { contains: term, mode: "insensitive" } },
      { sku: { contains: term, mode: "insensitive" } },
      { variants: { some: { sku: { contains: term, mode: "insensitive" } } } },
    ];
  }
  if (categoryId && categoryId !== "all") where.categoryId = categoryId;
  return where;
}

export async function listAdminProducts<T extends { id: string }>(
  query: AdminProductListQuery,
  load: (args: ProductLoadArgs) => Promise<T[]>,
): Promise<{ products: Array<T & { stock: number }>; totalCount: number }> {
  const where = adminProductWhere(query.search, query.categoryId);
  const paging = query.page
    ? { skip: (query.page - 1) * query.pageSize, take: query.pageSize }
    : null;
  const stockDirection =
    query.sort === "stock_asc" ? "asc" : query.sort === "stock_desc" ? "desc" : null;

  if (stockDirection) {
    const matching = await prisma.product.findMany({ where, select: { id: true } });
    const ranked = await rankProductsByAvailability(
      matching.map((p) => p.id),
      stockDirection,
      paging,
    );
    const rows = ranked.length ? await load({ where: { id: { in: ranked.map((r) => r.productId) } } }) : [];
    const byId = new Map(rows.map((row) => [row.id, row]));
    const products = ranked.flatMap((r) => {
      const row = byId.get(r.productId);
      return row ? [{ ...row, stock: r.available }] : [];
    });
    return { products, totalCount: matching.length };
  }

  const orderBy = ORDER_BY[query.sort ?? ""] ?? { createdAt: "desc" };
  const [rows, totalCount] = await Promise.all([
    load({ where, orderBy, ...(paging ?? {}) }),
    prisma.product.count({ where }),
  ]);
  // Stock comes from the Inventory domain; the deprecated Product.stock
  // column is no longer maintained.
  const availability = await availabilityByProduct(rows.map((r) => r.id));
  return {
    products: rows.map((row) => ({ ...row, stock: availability.get(row.id)?.available ?? 0 })),
    totalCount,
  };
}
