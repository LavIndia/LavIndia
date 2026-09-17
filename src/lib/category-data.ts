import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { isNewArrival, isBestSeller } from "@/lib/product-tags";

async function fetchCategoryProducts(categorySlug: string, limit: number) {
  const [products, totalCount] = await Promise.all([
    prisma.product.findMany({
      where: { isActive: true, isPublished: true, category: { slug: categorySlug } },
      include: {
        images: { orderBy: { position: "asc" }, take: 3 },
        variants: { where: { isActive: true }, orderBy: { stock: "desc" } },
        category: true,
        _count: { select: { orderItems: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    prisma.product.count({
      where: { isActive: true, isPublished: true, category: { slug: categorySlug } },
    }),
  ]);

  const transformedProducts = products.map((product) => ({
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    price: product.priceCents / 100,
    compareAtPrice: product.compareAtCents
      ? product.compareAtCents / 100
      : null,
    stock: product.stock || 0,
    sku: product.sku,
    isFeatured: product.isFeatured,
    isLimitedEdition: product.isLimitedEdition,
    isNewArrival: isNewArrival(product.createdAt),
    isBestSeller: isBestSeller(product._count.orderItems),
    images: [product.images.find((image) => image.isPrimary) || product.images[0]]
      .filter(Boolean)
      .map((img) => ({
      url: img.url,
      alt: img.alt || product.name,
      })),
    variants: product.variants.map((variant) => ({
      id: variant.id,
      name: variant.name,
      price: variant.priceCents
        ? variant.priceCents / 100
        : product.priceCents / 100,
      color: variant.color,
      size: variant.size,
      material: variant.material,
      stock: variant.stock,
    })),
    category: {
      name: product.category.name,
      slug: product.category.slug,
    },
  }));

  const totalPages = Math.ceil(totalCount / limit);

  return {
    products: transformedProducts,
    pagination: {
      page: 1,
      limit,
      totalCount,
      totalPages,
      hasNextPage: totalPages > 1,
      hasPrevPage: false,
    },
  };
}

// Cached per (categorySlug, limit) pair. Tagged with a broad "products" tag
// (busted by any admin product mutation) and a category-specific tag, plus a
// 60s revalidate window as a safety net in case a tag invalidation is missed.
export async function getCategoryProducts(categorySlug: string, limit = 30) {
  const cached = unstable_cache(
    () => fetchCategoryProducts(categorySlug, limit),
    ["category-products", categorySlug, String(limit)],
    { tags: ["products", `category-${categorySlug}`], revalidate: 60 }
  );
  return cached();
}

export type FilterType = "CHECKBOX" | "DROPDOWN" | "RANGE" | "COLOR";

async function fetchCategoryFilters(categorySlug: string) {
  const filters = await prisma.filter.findMany({
    where: {
      isActive: true,
      categories: { some: { category: { slug: categorySlug } } },
    },
    include: { options: { orderBy: { order: "asc" } } },
    orderBy: { order: "asc" },
  });

  return filters.map((filter) => ({
    ...filter,
    type: filter.type as FilterType,
  }));
}

export async function getCategoryFilters(categorySlug: string) {
  const cached = unstable_cache(
    () => fetchCategoryFilters(categorySlug),
    ["category-filters", categorySlug],
    { tags: ["filters", `category-${categorySlug}`], revalidate: 60 }
  );
  return cached();
}

async function fetchCategoryBySlug(categorySlug: string) {
  return prisma.category.findUnique({
    where: { slug: categorySlug },
    select: { id: true, name: true, slug: true, description: true, image: true },
  });
}

// Every category page (bespoke or admin-created) needs this to render its
// hero and to tell "not found" from "no products yet" — cached the same way
// as the rest of this file so a repeat visit costs no extra DB round trip.
export async function getCategoryBySlug(categorySlug: string) {
  const cached = unstable_cache(
    () => fetchCategoryBySlug(categorySlug),
    ["category-meta", categorySlug],
    { tags: ["products", `category-${categorySlug}`], revalidate: 60 }
  );
  return cached();
}

export async function getCategoryPageData(categorySlug: string, limit = 30) {
  const [category, { products, pagination }, filters] = await Promise.all([
    getCategoryBySlug(categorySlug),
    getCategoryProducts(categorySlug, limit),
    getCategoryFilters(categorySlug),
  ]);

  return { category, products, pagination, filters };
}
