"use client";

import { useId } from "react";
import Link from "next/link";
import { ImageOff, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { variantImageUrl } from "@/modules/catalog/client";
import { variantDisplayName } from "@/components/admin/products/product-form-variants";
import type {
  ProductImage,
  ProductVariant,
  StockByVariant,
} from "@/components/admin/products/product-form-types";
import {
  coverCellEmptyStyle,
  coverCellThumbStyle,
  onHandStyle,
  tableWrapStyle,
  variantHintStyle,
} from "@/components/admin/products/product-form.styles";
import { css, cx } from "styled-system/css";

/**
 * The product's sellable variants, one per row.
 *
 * A row is what the rest of the platform sees when it looks at this product:
 * the image it will show (its option value's set, else the product's), the
 * title derived from its option values, its price, the SKU and barcode it is
 * identified by, and — read from Inventory, never edited here — how many are
 * on hand. Images are not managed from the row: they belong to option
 * values, and are filed in the Images card above.
 */

const titleStyle = css({ fontWeight: "semibold", color: "fg.default" });
const optionChipsStyle = css({ display: "flex", flexWrap: "wrap", gap: "1", marginTop: "1" });
const optionChipStyle = css({
  borderRadius: "full",
  background: "gold.50",
  border: "1px solid",
  borderColor: "gold.200",
  color: "gold.700",
  paddingInline: "1.5",
  paddingBlock: "0.5",
  fontSize: "2xs",
  fontWeight: "medium",
});
const monoStyle = css({ fontFamily: "mono", fontSize: "xs", color: "fg.default" });
const pendingStyle = css({ fontSize: "xs", color: "fg.muted", fontStyle: "italic" });
const priceInputStyle = css({ width: "28" });
const linkStyle = css({ color: "accent.pressed", textDecoration: "underline", textUnderlineOffset: "3px" });

const ATTRIBUTES: { key: "color" | "size" | "material"; label: string }[] = [
  { key: "color", label: "Colour" },
  { key: "size", label: "Size" },
  { key: "material", label: "Material" },
];

export interface VariantsTableProps {
  variants: ProductVariant[];
  images: ProductImage[];
  basePrice: string;
  stockByVariant: StockByVariant;
  onUpdate: (index: number, field: keyof ProductVariant, value: string | number | null) => void;
  onRemove: (index: number) => void;
}

function OnHand({ variant, stock }: { variant: ProductVariant; stock: StockByVariant }) {
  if (!variant.id) return <span className={pendingStyle}>after save</span>;
  const level = stock[variant.id];
  const quantity = level?.quantity ?? 0;
  const reserved = level?.reserved ?? 0;
  return (
    <span className={onHandStyle}>
      <strong>{quantity}</strong>
      {reserved > 0 ? <span className={variantHintStyle}> · {reserved} reserved</span> : null}
    </span>
  );
}

function VariantTableRow({
  variant,
  index,
  images,
  basePrice,
  stock,
  onUpdate,
  onRemove,
}: {
  variant: ProductVariant;
  index: number;
  images: ProductImage[];
  basePrice: string;
  stock: StockByVariant;
  onUpdate: VariantsTableProps["onUpdate"];
  onRemove: VariantsTableProps["onRemove"];
}) {
  const ids = useId();
  const attributes = ATTRIBUTES.filter((a) => variant[a.key]);
  const title = variantDisplayName(variant);
  // Same rule the storefront and POS apply, so the admin sees what they see.
  const imageUrl = variantImageUrl(
    images.map((img) => ({
      url: img.url,
      position: img.position,
      isPrimary: img.isPrimary,
      optionDimension: img.group?.dimension ?? null,
      optionValue: img.group?.value ?? null,
    })),
    variant,
  );

  return (
    <TableRow>
      <TableCell>
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className={coverCellThumbStyle} />
        ) : (
          <span className={coverCellEmptyStyle} title="No image yet">
            <ImageOff className={css({ height: "4", width: "4" })} />
          </span>
        )}
      </TableCell>
      <TableCell>
        {attributes.length > 0 ? (
          <>
            <div className={titleStyle}>{title}</div>
            <div className={optionChipsStyle}>
              {attributes.map((a) => (
                <span key={a.key} className={optionChipStyle}>
                  {a.label}: {variant[a.key]}
                </span>
              ))}
            </div>
          </>
        ) : variant.isDefault ? (
          <>
            <div className={titleStyle}>{variant.name}</div>
            <div className={cx(variantHintStyle, css({ marginTop: "1" }))}>
              Sold as a single item
            </div>
          </>
        ) : (
          <Input
            id={`${ids}-name`}
            aria-label="Variant name"
            placeholder="Name this variant"
            value={variant.name}
            onChange={(e) => onUpdate(index, "name", e.target.value)}
            required
          />
        )}
      </TableCell>
      <TableCell>
        <Input
          id={`${ids}-price`}
          type="number"
          step="0.01"
          min="0"
          aria-label={`Price for ${title || "variant"}`}
          className={priceInputStyle}
          placeholder={basePrice ? `₹${basePrice}` : "Base"}
          value={variant.priceCents ? variant.priceCents / 100 : ""}
          onChange={(e) =>
            onUpdate(index, "priceCents", e.target.value ? parseFloat(e.target.value) * 100 : null)
          }
        />
      </TableCell>
      <TableCell>
        {variant.sku ? (
          <span className={monoStyle}>{variant.sku}</span>
        ) : (
          <span className={pendingStyle}>on save</span>
        )}
      </TableCell>
      <TableCell>
        {variant.barcode ? (
          <span className={monoStyle}>{variant.barcode}</span>
        ) : (
          <span className={pendingStyle}>on save</span>
        )}
      </TableCell>
      <TableCell>
        <OnHand variant={variant} stock={stock} />
      </TableCell>
      <TableCell className={css({ textAlign: "right" })}>
        {!variant.isDefault ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Remove ${title || "variant"}`}
            onClick={() => onRemove(index)}
          >
            <Trash2 className={css({ height: "4", width: "4", color: "danger" })} />
          </Button>
        ) : null}
      </TableCell>
    </TableRow>
  );
}

export function VariantsTable({
  variants,
  images,
  basePrice,
  stockByVariant,
  onUpdate,
  onRemove,
}: VariantsTableProps) {
  return (
    <div className={tableWrapStyle}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Image</TableHead>
            <TableHead>Variant</TableHead>
            <TableHead>Price (₹)</TableHead>
            <TableHead>SKU</TableHead>
            <TableHead>Barcode</TableHead>
            <TableHead>
              On hand{" "}
              <Link href="/admin/inventory/receive" className={cx(linkStyle, variantHintStyle)}>
                receive
              </Link>
            </TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {variants.map((variant, index) => (
            <VariantTableRow
              key={variant.clientId}
              variant={variant}
              index={index}
              images={images}
              basePrice={basePrice}
              stock={stockByVariant}
              onUpdate={onUpdate}
              onRemove={onRemove}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
