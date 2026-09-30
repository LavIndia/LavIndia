/**
 * What the offer editor needs to know about the catalog: every sellable
 * piece with the facts offers select on, and the names to show.
 *
 * A documented read-side exception to "domains do not read each other's
 * tables", like the inventory read models: the editor has to count matching
 * pieces, check margins and fill a test cart as the admin types, and doing
 * that through the Catalog contract piece by piece would be hundreds of
 * calls. One query, read only, DTO out.
 */
import { prisma } from "../../_shared/db";
import type { EngineLine } from "../contracts";
import type { NameLookup } from "../summarise";

export interface PieceFact {
  variantId: string;
  productId: string;
  productName: string;
  variantName: string | null;
  sku: string | null;
  categoryId: string;
  collectionIds: string[];
  material: string | null;
  color: string | null;
  size: string | null;
  tags: string[];
  imageUrl: string | null;
  compareAtCents: number | null;
  isFeatured: boolean;
  isLimitedEdition: boolean;
  ageDays: number;
  priceCents: number;
  costCents: number | null;
  onlineSellable: boolean;
  storeSellable: boolean;
}

export interface CatalogFacts {
  pieces: PieceFact[];
  names: NameLookup;
  categories: Array<{ id: string; name: string }>;
  collections: Array<{ id: string; name: string }>;
  products: Array<{ id: string; name: string; priceCents: number }>;
  materials: string[];
  colors: string[];
  sizes: string[];
  tags: string[];
}

function distinct(values: Array<string | null>): string[] {
  const seen = new Map<string, string>();
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed && !seen.has(trimmed.toLowerCase())) seen.set(trimmed.toLowerCase(), trimmed);
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b));
}

export async function loadCatalogFacts(): Promise<CatalogFacts> {
  const [variants, categories, collections] = await Promise.all([
    prisma.productVariant.findMany({
      where: { isActive: true, product: { isActive: true } },
      select: {
        id: true,
        name: true,
        sku: true,
        isDefault: true,
        color: true,
        size: true,
        priceCents: true,
        product: {
          select: {
            id: true,
            name: true,
            categoryId: true,
            material: true,
            priceCents: true,
            costCents: true,
            isPublished: true,
            retiredAt: true,
            tags: true,
            compareAtCents: true,
            isFeatured: true,
            isLimitedEdition: true,
            createdAt: true,
            images: { select: { url: true }, orderBy: [{ isPrimary: "desc" }, { position: "asc" }], take: 1 },
            collections: { select: { collectionId: true } },
          },
        },
      },
      orderBy: [{ product: { name: "asc" } }, { position: "asc" }],
    }),
    prisma.category.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.collection.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const pieces: PieceFact[] = variants.map((v) => ({
    variantId: v.id,
    productId: v.product.id,
    productName: v.product.name,
    variantName: v.isDefault ? null : v.name,
    sku: v.sku,
    categoryId: v.product.categoryId,
    collectionIds: v.product.collections.map((c) => c.collectionId),
    material: v.product.material,
    color: v.color,
    size: v.size,
    tags: v.product.tags,
    imageUrl: v.product.images[0]?.url ?? null,
    compareAtCents: v.product.compareAtCents,
    isFeatured: v.product.isFeatured,
    isLimitedEdition: v.product.isLimitedEdition,
    ageDays: Math.floor((Date.now() - v.product.createdAt.getTime()) / 86_400_000),
    priceCents: v.priceCents ?? v.product.priceCents,
    costCents: v.product.costCents,
    onlineSellable: v.product.isPublished && !v.product.retiredAt,
    storeSellable: true,
  }));

  const products = new Map<string, { id: string; name: string; priceCents: number }>();
  for (const v of variants) {
    if (!products.has(v.product.id)) {
      products.set(v.product.id, { id: v.product.id, name: v.product.name, priceCents: v.product.priceCents });
    }
  }

  const names: NameLookup = {
    categories: Object.fromEntries(categories.map((c) => [c.id, c.name])),
    collections: Object.fromEntries(collections.map((c) => [c.id, c.name])),
    products: Object.fromEntries([...products.values()].map((p) => [p.id, p.name])),
    variants: Object.fromEntries(
      pieces.map((p) => [p.variantId, p.variantName ? `${p.productName} — ${p.variantName}` : p.productName]),
    ),
  };

  return {
    pieces,
    names,
    categories,
    collections,
    products: [...products.values()],
    materials: distinct(pieces.map((p) => p.material)),
    colors: distinct(pieces.map((p) => p.color)),
    sizes: distinct(pieces.map((p) => p.size)),
    tags: distinct(pieces.flatMap((p) => p.tags)),
  };
}

/** A piece as a one-unit cart line, for matching and test carts. */
export function pieceAsLine(piece: PieceFact, quantity = 1, lineId = piece.variantId): EngineLine {
  return {
    lineId,
    variantId: piece.variantId,
    productId: piece.productId,
    categoryId: piece.categoryId,
    collectionIds: piece.collectionIds,
    material: piece.material,
    color: piece.color,
    size: piece.size,
    tags: piece.tags,
    compareAtCents: piece.compareAtCents,
    isFeatured: piece.isFeatured,
    isLimitedEdition: piece.isLimitedEdition,
    ageDays: piece.ageDays,
    unitPriceCents: piece.priceCents,
    quantity,
  };
}
