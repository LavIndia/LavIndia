/**
 * The Catalog domain's service — the only implementation of `CatalogPort`.
 *
 * Everything leaving this file is a DTO. No Prisma row and no relation
 * handle crosses the boundary, so a consumer cannot reach past the contract
 * into catalog internals even by accident.
 */
import { Prisma } from "@prisma/client";
import { prisma } from "../_shared/db";
import {
  Barcode,
  ProductId,
  Sku,
  VariantId,
  type ProductId as ProductIdType,
  type VariantId as VariantIdType,
} from "../_shared/ids";
import type {
  CatalogPort,
  CatalogProductWithVariants,
  CatalogSearchOptions,
  SellableVariant,
} from "./contracts";

/**
 * One image per row, best first: an explicitly primary image, otherwise the
 * lowest position. Keeping this as a nested `take: 1` means a page of
 * variants is still a single query rather than an N+1 walk.
 */
const BEST_IMAGE = {
  orderBy: [{ isPrimary: "desc" }, { position: "asc" }],
  take: 1,
  select: { url: true },
} satisfies Prisma.ProductImageFindManyArgs;

const VARIANT_SELECT = {
  id: true,
  name: true,
  sku: true,
  barcode: true,
  priceCents: true,
  isDefault: true,
  trackingMode: true,
  isActive: true,
  color: true,
  size: true,
  material: true,
  productId: true,
  images: BEST_IMAGE,
  product: {
    select: {
      id: true,
      name: true,
      slug: true,
      priceCents: true,
      compareAtCents: true,
      isActive: true,
      isPublished: true,
      images: { ...BEST_IMAGE, where: { variantId: null } },
    },
  },
} satisfies Prisma.ProductVariantSelect;

type VariantRow = Prisma.ProductVariantGetPayload<{ select: typeof VARIANT_SELECT }>;

function toSellableVariant(row: VariantRow): SellableVariant {
  return {
    variantId: VariantId(row.id),
    productId: ProductId(row.productId),
    productName: row.product.name,
    productSlug: row.product.slug,
    variantName: row.name,
    isDefault: row.isDefault,
    trackingMode: row.trackingMode,
    sku: row.sku ? Sku(row.sku) : null,
    barcode: row.barcode ? Barcode(row.barcode) : null,
    // A variant may override the product's price; otherwise it inherits it.
    // Resolving it here means no consumer ever has to know that rule.
    priceCents: row.priceCents ?? row.product.priceCents,
    compareAtCents: row.product.compareAtCents,
    isActive: row.isActive && row.product.isActive,
    imageUrl: row.images[0]?.url ?? row.product.images[0]?.url ?? null,
    attributes: {
      color: row.color,
      size: row.size,
      material: row.material,
    },
  };
}

/** Only published, active products with active variants may be sold. */
const SELLABLE_WHERE: Prisma.ProductVariantWhereInput = {
  isActive: true,
  product: { isActive: true, isPublished: true },
};

class CatalogService implements CatalogPort {
  async findVariantById(variantId: VariantIdType): Promise<SellableVariant | null> {
    const row = await prisma.productVariant.findUnique({
      where: { id: variantId },
      select: VARIANT_SELECT,
    });
    return row ? toSellableVariant(row) : null;
  }

  async findVariantsByIds(variantIds: readonly VariantIdType[]): Promise<SellableVariant[]> {
    if (variantIds.length === 0) return [];
    const rows = await prisma.productVariant.findMany({
      where: { id: { in: [...variantIds] } },
      select: VARIANT_SELECT,
    });
    return rows.map(toSellableVariant);
  }

  async findVariantBySku(sku: Sku): Promise<SellableVariant | null> {
    const row = await prisma.productVariant.findUnique({
      where: { sku },
      select: VARIANT_SELECT,
    });
    return row ? toSellableVariant(row) : null;
  }

  async findVariantByBarcode(barcode: Barcode): Promise<SellableVariant | null> {
    const row = await prisma.productVariant.findUnique({
      where: { barcode },
      select: VARIANT_SELECT,
    });
    return row ? toSellableVariant(row) : null;
  }

  /**
   * Resolves a code that may be either identifier, in one query. Every input
   * source — camera scan, hardware scanner, typed entry — arrives here, so
   * the lookup rules live in exactly one place.
   */
  async findVariantByCode(code: string): Promise<SellableVariant | null> {
    const trimmed = code.trim();
    if (!trimmed) return null;

    const row = await prisma.productVariant.findFirst({
      where: { OR: [{ barcode: trimmed }, { sku: trimmed }] },
      select: VARIANT_SELECT,
    });
    return row ? toSellableVariant(row) : null;
  }

  async searchVariants(options: CatalogSearchOptions): Promise<SellableVariant[]> {
    const { query, limit = 20, sellableOnly = true } = options;
    const where: Prisma.ProductVariantWhereInput = sellableOnly ? { ...SELLABLE_WHERE } : {};

    if (query?.trim()) {
      const q = query.trim();
      where.OR = [
        { sku: { equals: q, mode: "insensitive" } },
        { barcode: { equals: q } },
        { name: { contains: q, mode: "insensitive" } },
        { product: { name: { contains: q, mode: "insensitive" } } },
      ];
    }

    const rows = await prisma.productVariant.findMany({
      where,
      select: VARIANT_SELECT,
      take: limit,
      orderBy: [{ product: { name: "asc" } }, { position: "asc" }],
    });
    return rows.map(toSellableVariant);
  }

  async findProductWithVariants(
    productId: ProductIdType,
  ): Promise<CatalogProductWithVariants | null> {
    const [product] = await this.findProductsWithVariants([productId]);
    return product ?? null;
  }

  async findProductsWithVariants(
    productIds: readonly ProductIdType[],
  ): Promise<CatalogProductWithVariants[]> {
    if (productIds.length === 0) return [];

    const rows = await prisma.product.findMany({
      where: { id: { in: [...productIds] } },
      select: {
        id: true,
        name: true,
        slug: true,
        category: { select: { name: true } },
        images: { ...BEST_IMAGE, where: { variantId: null } },
        variants: { select: VARIANT_SELECT, orderBy: { position: "asc" } },
      },
    });

    return rows.map((row) => ({
      productId: ProductId(row.id),
      productName: row.name,
      productSlug: row.slug,
      categoryName: row.category?.name ?? null,
      imageUrl: row.images[0]?.url ?? null,
      variants: row.variants.map(toSellableVariant),
    }));
  }
}

/**
 * The single instance other modules import. Swapping this for an HTTP-backed
 * implementation when Catalog is split out is a one-line change here.
 */
export const catalogService: CatalogPort = new CatalogService();
