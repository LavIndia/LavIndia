"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { VariantsTable } from "@/components/admin/products/VariantsTable";
import type {
  ProductImage,
  ProductVariant,
  StockByVariant,
} from "@/components/admin/products/product-form-types";
import { variantHintStyle } from "@/components/admin/products/product-form.styles";
import { css } from "styled-system/css";

/**
 * The forms a product is sold in.
 *
 * A product with no options is still sold as exactly one variant — the
 * implicit "Default" — so that Inventory, POS and Billing never have to
 * special-case a bare product. It appears here as a single row the same as
 * any other variant, because to the rest of the platform that is what it is.
 */

const cardContentStyle = css({ display: "flex", flexDirection: "column", gap: "3" });

export interface ProductVariantsCardProps {
  variants: ProductVariant[];
  images: ProductImage[];
  basePrice: string;
  stockByVariant: StockByVariant;
  onUpdateVariant: (
    index: number,
    field: keyof ProductVariant,
    value: string | number | null,
  ) => void;
  onRemoveVariant: (index: number) => void;
}

export function ProductVariantsCard({
  variants,
  images,
  basePrice,
  stockByVariant,
  onUpdateVariant,
  onRemoveVariant,
}: ProductVariantsCardProps) {
  const onlyDefault = variants.length === 1 && variants[0].isDefault === true;
  const count = variants.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Variants{count > 0 ? ` (${count})` : ""}</CardTitle>
        <CardDescription>
          {onlyDefault
            ? "Sold as a single item. Add option values above and generate variants to sell it in more than one form."
            : "Every form this product is sold in. Each gets its own SKU and barcode when saved; stock is received against it in Inventory. The image is the first from its option value's set, else the product's."}
        </CardDescription>
      </CardHeader>
      <CardContent className={cardContentStyle}>
        {variants.length === 0 ? (
          <p className={variantHintStyle}>
            No variants yet. Saving will create a single Default variant so the
            product can be stocked and sold; or generate variants from the
            options above first.
          </p>
        ) : (
          <VariantsTable
            variants={variants}
            images={images}
            basePrice={basePrice}
            stockByVariant={stockByVariant}
            onUpdate={onUpdateVariant}
            onRemove={onRemoveVariant}
          />
        )}
      </CardContent>
    </Card>
  );
}
