/**
 * Creating a product, as one unit: the product row, its variants, its
 * images, and the invariants every product must satisfy (a Default variant
 * when it has no options; a SKU and barcode on every variant).
 *
 * Both ways a product enters the catalog — the admin product form and the
 * CSV bulk upload — go through here, so neither can produce a product the
 * other could not. It runs inside the caller's transaction so the caller can
 * add its own writes (opening stock, for one) to the same atomic unit.
 */
import type { Prisma } from "@prisma/client";
import type { Tx } from "../../_shared/db";
import { enforceVariantInvariants } from "../variants/variant-integrity";

export interface NewVariantInput {
  name: string;
  color?: string | null;
  size?: string | null;
  material?: string | null;
  priceCents?: number | null;
  stock?: number;
}

export interface NewImageInput {
  url: string;
  alt?: string | null;
  isPrimary?: boolean;
  position?: number;
  optionDimension?: "color" | "size" | "material" | null;
  optionValue?: string | null;
}

export interface NewProductInput {
  product: Prisma.ProductUncheckedCreateInput;
  variants?: readonly NewVariantInput[];
  images?: readonly NewImageInput[];
}

/** Creates the product and returns its id. */
export async function createProductInTx(tx: Tx, input: NewProductInput): Promise<{ id: string }> {
  const created = await tx.product.create({ data: input.product, select: { id: true } });

  // One INSERT for the whole set rather than one per row. Fields are picked
  // explicitly, so a client's own ids on the input are never written.
  if (input.variants?.length) {
    await tx.productVariant.createMany({
      data: input.variants.map((v) => ({
        name: v.name,
        color: v.color ?? null,
        size: v.size ?? null,
        material: v.material ?? null,
        priceCents: v.priceCents ?? null,
        stock: v.stock ?? 0,
        productId: created.id,
      })),
    });
  }

  if (input.images?.length) {
    await tx.productImage.createMany({
      data: input.images.map(({ optionDimension, optionValue, ...img }) => {
        // A group needs both halves; anything less is a general image.
        const grouped = optionDimension && optionValue;
        return {
          url: img.url,
          alt: img.alt ?? null,
          isPrimary: img.isPrimary ?? false,
          position: img.position ?? 0,
          productId: created.id,
          optionDimension: grouped ? optionDimension : null,
          optionValue: grouped ? optionValue : null,
        };
      }),
    });
  }

  // Last, so a product with no options gets its implicit Default variant and
  // every variant leaves here with a SKU and barcode.
  await enforceVariantInvariants(tx, created.id);

  return { id: created.id };
}
