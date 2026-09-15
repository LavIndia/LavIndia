import { prisma } from "@/lib/prisma";

export async function getCategoryProducts(categorySlug: string, limit = 30) {
  const normalizedSlug = categorySlug === "necklaces" ? "necklace" : categorySlug;
  const [products, totalCount] = await Promise.all([
    prisma.product.findMany({
      where: { isActive: true, category: { slug: normalizedSlug } },
      include: {
        images: { orderBy: { position: "asc" }, take: 3 },
        variants: { where: { isActive: true }, orderBy: { stock: "desc" } },
        category: true,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    prisma.product.count({
      where: { isActive: true, category: { slug: normalizedSlug } },
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

export type FilterType = "CHECKBOX" | "DROPDOWN" | "RANGE" | "COLOR";

export async function getCategoryFilters(categorySlug: string) {
  const normalizedSlug = categorySlug === "necklaces" ? "necklace" : categorySlug;
  const filters = await prisma.filter.findMany({
    where: {
      isActive: true,
      categories: { some: { category: { slug: normalizedSlug } } },
    },
    include: { options: { orderBy: { order: "asc" } } },
    orderBy: { order: "asc" },
  });

  return filters.map((filter) => ({
    ...filter,
    type: filter.type as FilterType,
  }));
}

export async function getCategoryPageData(categorySlug: string, limit = 30) {
  const [{ products, pagination }, filters] = await Promise.all([
    getCategoryProducts(categorySlug, limit),
    getCategoryFilters(categorySlug),
  ]);

  return { products, pagination, filters };
}
