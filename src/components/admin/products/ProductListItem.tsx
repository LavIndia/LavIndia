"use client";

import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { TableCell, TableRow } from "@/components/ui/table";
import { ImageLightbox } from "@/components/ui/image-lightbox";
import { Pencil, Trash2, Plus, Minus } from "lucide-react";
import { css } from "styled-system/css";

export interface ProductListItemProduct {
  id: string;
  name: string;
  slug: string;
  priceCents: number;
  compareAtCents: number | null;
  stock: number;
  isPublished: boolean;
  createdAt: Date;
  category: {
    id: string;
    name: string;
  };
  images: Array<{
    url: string;
    alt: string | null;
  }>;
}

export function formatProductPrice(cents: number) {
  return `₹${(cents / 100).toLocaleString("en-IN")}`;
}

interface SharedProductRowProps {
  product: ProductListItemProduct;
  selected: boolean;
  onToggleSelected: (id: string, isSelected: boolean) => void;
  editingStock?: number;
  onStockChange: (productId: string, value: string) => void;
  onStockBlur: (productId: string, currentStock: number) => void;
  onIncrementStock: (productId: string, currentStock: number) => void;
  onDecrementStock: (productId: string, currentStock: number) => void;
  onDeleteClick: (product: ProductListItemProduct) => void;
  onRowClick: (product: ProductListItemProduct) => void;
  onTogglePublished: (product: ProductListItemProduct) => void;
  togglingPublishedId: string | null;
  /** Hide the category column/line — redundant when the list is already scoped to one category. */
  showCategory?: boolean;
  /** Hide the select checkbox — for read-only lists with no bulk actions. */
  showCheckbox?: boolean;
}

/** Desktop/tablet table row — one row per product, used by both the Products page table and the category-scoped dialog. */
export function ProductTableRow({
  product,
  selected,
  onToggleSelected,
  editingStock,
  onStockChange,
  onStockBlur,
  onIncrementStock,
  onDecrementStock,
  onDeleteClick,
  onRowClick,
  onTogglePublished,
  togglingPublishedId,
  showCategory = true,
  showCheckbox = true,
}: SharedProductRowProps) {
  return (
    <TableRow
      key={product.id}
      onClick={() => onRowClick(product)}
      className={css({ cursor: "pointer" })}
    >
      {showCheckbox && (
        <TableCell onClick={(e) => e.stopPropagation()}>
          <Checkbox
            aria-label={`Select ${product.name}`}
            isSelected={selected}
            onChange={(isSelected) => onToggleSelected(product.id, isSelected)}
          />
        </TableCell>
      )}
      <TableCell onClick={(e) => e.stopPropagation()}>
        {product.images[0] ? (
          <ImageLightbox src={product.images[0].url} alt={product.images[0].alt || product.name}>
            <Image
              src={product.images[0].url}
              alt={product.images[0].alt || product.name}
              width={50}
              height={50}
              className={css({ borderRadius: "md", objectFit: "cover" })}
            />
          </ImageLightbox>
        ) : (
          <div
            className={css({
              width: "[50px]",
              height: "[50px]",
              background: "ivory.100",
              borderRadius: "md",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "xs",
              color: "fg.muted",
            })}
          >
            No image
          </div>
        )}
      </TableCell>
      <TableCell className={css({ fontWeight: "medium" })}>{product.name}</TableCell>
      {showCategory && <TableCell>{product.category.name}</TableCell>}
      <TableCell>
        <div className={css({ display: "flex", flexDirection: "column" })}>
          <span>{formatProductPrice(product.priceCents)}</span>
          {product.compareAtCents && (
            <span
              className={css({
                fontSize: "xs",
                color: "fg.muted",
                textDecoration: "line-through",
              })}
            >
              {formatProductPrice(product.compareAtCents)}
            </span>
          )}
        </div>
      </TableCell>
      <TableCell onClick={(e) => e.stopPropagation()}>
        <div className={css({ display: "flex", alignItems: "center", gap: "1" })}>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => onDecrementStock(product.id, product.stock)}
          >
            <Minus className={css({ height: "3", width: "3" })} />
          </Button>
          <Input
            type="number"
            min="0"
            value={editingStock !== undefined ? editingStock : product.stock}
            onChange={(e) => onStockChange(product.id, e.target.value)}
            onBlur={() => onStockBlur(product.id, product.stock)}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
            }}
            className={css({ height: "7", width: "16", textAlign: "center", paddingInline: "1" })}
          />
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => onIncrementStock(product.id, product.stock)}
          >
            <Plus className={css({ height: "3", width: "3" })} />
          </Button>
          <Badge
            variant={product.stock > 10 ? "default" : product.stock > 0 ? "outline" : "destructive"}
            className={css({ marginLeft: "1" })}
          >
            {product.stock > 10 ? "In Stock" : product.stock > 0 ? "Low" : "Out"}
          </Badge>
        </div>
      </TableCell>
      <TableCell onClick={(e) => e.stopPropagation()}>
        <div className={css({ display: "flex", alignItems: "center", gap: "2" })}>
          <Switch
            checked={product.isPublished}
            onCheckedChange={() => onTogglePublished(product)}
            disabled={togglingPublishedId === product.id}
            aria-label={product.isPublished ? `Move ${product.name} to draft` : `Publish ${product.name}`}
          />
          <span className={css({ fontSize: "sm", color: product.isPublished ? "fg.default" : "fg.muted" })}>
            {product.isPublished ? "Published" : "Draft"}
          </span>
        </div>
      </TableCell>
      <TableCell className={css({ textAlign: "right" })} onClick={(e) => e.stopPropagation()}>
        <div className={css({ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "2" })}>
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/admin/products/${product.id}/edit`} aria-label={`Edit ${product.name}`}>
              <Pencil className={css({ height: "4", width: "4" })} />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Delete ${product.name}`}
            onClick={() => onDeleteClick(product)}
          >
            <Trash2 className={css({ height: "4", width: "4", color: "danger" })} />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

/** Mobile card — one product per card, used by both the Products page and the category-scoped dialog. */
export function ProductMobileCard({
  product,
  selected,
  onToggleSelected,
  editingStock,
  onStockChange,
  onStockBlur,
  onIncrementStock,
  onDecrementStock,
  onDeleteClick,
  onRowClick,
  onTogglePublished,
  togglingPublishedId,
  showCategory = true,
  showCheckbox = true,
}: SharedProductRowProps) {
  return (
    <div
      onClick={() => onRowClick(product)}
      className={css({
        borderRadius: "xl",
        border: "1px solid",
        borderColor: "border.subtle",
        background: "bg.surface",
        padding: "3",
        display: "flex",
        flexDirection: "column",
        gap: "3",
        cursor: "pointer",
        "&:hover": { borderColor: "accent.default" },
      })}
    >
      <div className={css({ display: "flex", gap: "3", alignItems: "flex-start" })}>
        {showCheckbox && (
          <Checkbox
            aria-label={`Select ${product.name}`}
            isSelected={selected}
            onChange={(isSelected) => onToggleSelected(product.id, isSelected)}
            onClick={(e) => e.stopPropagation()}
            className={css({ marginTop: "1" })}
          />
        )}
        {product.images[0] ? (
          <ImageLightbox
            src={product.images[0].url}
            alt={product.images[0].alt || product.name}
            className={css({ flexShrink: 0 })}
          >
            <Image
              src={product.images[0].url}
              alt={product.images[0].alt || product.name}
              width={56}
              height={56}
              className={css({ borderRadius: "md", objectFit: "cover" })}
            />
          </ImageLightbox>
        ) : (
          <div
            className={css({
              width: "14",
              height: "14",
              flexShrink: 0,
              background: "ivory.100",
              borderRadius: "md",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "xs",
              color: "fg.muted",
            })}
          >
            No image
          </div>
        )}
        <div className={css({ flex: "1", minWidth: "0" })}>
          <p className={css({ fontWeight: "medium", color: "fg.default" })}>{product.name}</p>
          {showCategory && (
            <p className={css({ fontSize: "xs", color: "fg.muted" })}>{product.category.name}</p>
          )}
          <div className={css({ display: "flex", alignItems: "baseline", gap: "2", marginTop: "1" })}>
            <span className={css({ fontWeight: "medium" })}>{formatProductPrice(product.priceCents)}</span>
            {product.compareAtCents && (
              <span className={css({ fontSize: "xs", color: "fg.muted", textDecoration: "line-through" })}>
                {formatProductPrice(product.compareAtCents)}
              </span>
            )}
          </div>
        </div>
        <div
          className={css({ display: "flex", flexDirection: "column", gap: "1" })}
          onClick={(e) => e.stopPropagation()}
        >
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/admin/products/${product.id}/edit`} aria-label={`Edit ${product.name}`}>
              <Pencil className={css({ height: "4", width: "4" })} />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Delete ${product.name}`}
            onClick={() => onDeleteClick(product)}
          >
            <Trash2 className={css({ height: "4", width: "4", color: "danger" })} />
          </Button>
        </div>
      </div>

      <div
        onClick={(e) => e.stopPropagation()}
        className={css({
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingTop: "2",
          borderTop: "1px solid",
          borderColor: "border.subtle",
        })}
      >
        <div className={css({ display: "flex", alignItems: "center", gap: "1" })}>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => onDecrementStock(product.id, product.stock)}
          >
            <Minus className={css({ height: "3", width: "3" })} />
          </Button>
          <Input
            type="number"
            min="0"
            value={editingStock !== undefined ? editingStock : product.stock}
            onChange={(e) => onStockChange(product.id, e.target.value)}
            onBlur={() => onStockBlur(product.id, product.stock)}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
            }}
            className={css({ height: "7", width: "16", textAlign: "center", paddingInline: "1" })}
          />
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => onIncrementStock(product.id, product.stock)}
          >
            <Plus className={css({ height: "3", width: "3" })} />
          </Button>
          <Badge
            variant={product.stock > 10 ? "default" : product.stock > 0 ? "outline" : "destructive"}
          >
            {product.stock > 10 ? "In Stock" : product.stock > 0 ? "Low" : "Out"}
          </Badge>
        </div>
        <div
          className={css({ display: "flex", alignItems: "center", gap: "2" })}
          onClick={(e) => e.stopPropagation()}
        >
          <Switch
            checked={product.isPublished}
            onCheckedChange={() => onTogglePublished(product)}
            disabled={togglingPublishedId === product.id}
            aria-label={product.isPublished ? `Move ${product.name} to draft` : `Publish ${product.name}`}
          />
          <span className={css({ fontSize: "sm", color: product.isPublished ? "fg.default" : "fg.muted" })}>
            {product.isPublished ? "Published" : "Draft"}
          </span>
        </div>
      </div>
    </div>
  );
}
