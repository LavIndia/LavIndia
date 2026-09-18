"use client";

import { Fragment, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Pencil,
  Trash2,
  Search,
  Plus,
  Minus,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Layers,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { css } from "styled-system/css";

interface Product {
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

interface ProductsTableProps {
  products: Product[];
  categories: Array<{ id: string; name: string }>;
  searchParams: {
    search?: string;
    category?: string;
    sort?: string;
    page?: string;
    group?: string;
  };
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
}

export function ProductsTable({
  products,
  categories,
  searchParams,
  pagination,
}: ProductsTableProps) {
  const router = useRouter();
  const [search, setSearch] = useState(searchParams.search || "");
  const [category, setCategory] = useState(searchParams.category || "all");
  const [sort, setSort] = useState(searchParams.sort || "createdAt");
  const grouped = searchParams.group === "1";
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [editingStock, setEditingStock] = useState<{
    [key: string]: number;
  }>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [bulkWorking, setBulkWorking] = useState(false);

  const applyFilters = (
    searchValue?: string,
    categoryValue?: string,
    sortValue?: string,
    pageValue?: number,
    groupValue?: boolean,
  ) => {
    const params = new URLSearchParams();
    const finalSearch = searchValue ?? search;
    const finalCategory = categoryValue ?? category;
    const finalSort = sortValue ?? sort;
    const finalGrouped = groupValue ?? grouped;

    if (finalSearch) params.set("search", finalSearch);
    if (finalCategory !== "all") params.set("category", finalCategory);
    if (finalSort) params.set("sort", finalSort);
    if (pageValue && pageValue > 1) params.set("page", String(pageValue));
    if (finalGrouped) params.set("group", "1");
    router.push(`/admin/products?${params.toString()}`);
  };

  const toggleGrouped = () => {
    applyFilters(undefined, undefined, undefined, undefined, !grouped);
  };

  const toggleCategoryCollapsed = (categoryId: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  };

  const productGroups = grouped
    ? Object.values(
        products.reduce<Record<string, { category: Product["category"]; items: Product[] }>>(
          (acc, product) => {
            const key = product.category.id;
            if (!acc[key]) acc[key] = { category: product.category, items: [] };
            acc[key].items.push(product);
            return acc;
          },
          {},
        ),
      ).sort((a, b) => a.category.name.localeCompare(b.category.name))
    : [{ category: null, items: products }];

  const goToPage = (page: number) => {
    applyFilters(undefined, undefined, undefined, page);
  };

  const handleCategoryChange = (value: string) => {
    setCategory(value);
    applyFilters(undefined, value, undefined);
  };

  const handleSortChange = (value: string) => {
    setSort(value);
    applyFilters(undefined, undefined, value);
  };

  const handleSearch = () => {
    applyFilters(search, undefined, undefined);
  };

  const updateStock = async (productId: string, newStock: number) => {
    if (newStock < 0) return;

    try {
      const res = await fetch(`/api/admin/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stock: newStock }),
      });

      if (!res.ok) throw new Error("Failed to update stock");

      toast.success("Stock updated");
      router.refresh();
    } catch {
      toast.error("Failed to update stock");
    }
  };

  const handleStockChange = (productId: string, value: string) => {
    const numValue = parseInt(value) || 0;
    setEditingStock((prev) => ({ ...prev, [productId]: numValue }));
  };

  const handleStockBlur = (productId: string, currentStock: number) => {
    const newStock = editingStock[productId];
    if (newStock !== undefined && newStock !== currentStock) {
      updateStock(productId, newStock);
    }
    setEditingStock((prev) => {
      const updated = { ...prev };
      delete updated[productId];
      return updated;
    });
  };

  const incrementStock = (productId: string, currentStock: number) => {
    updateStock(productId, currentStock + 1);
  };

  const decrementStock = (productId: string, currentStock: number) => {
    if (currentStock > 0) {
      updateStock(productId, currentStock - 1);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/products/${deleteTarget.id}`, {
        method: "DELETE",
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to delete");

      toast.success(
        result.archived
          ? "Product archived because it has existing orders"
          : "Product deleted successfully",
      );
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(deleteTarget.id);
        return next;
      });
      setDeleteTarget(null);
      router.refresh();
    } catch {
      toast.error("Failed to delete product");
    } finally {
      setDeleting(false);
    }
  };

  const toggleSelected = (id: string, isSelected: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (isSelected) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const toggleSelectAll = (isSelected: boolean) => {
    setSelected(isSelected ? new Set(products.map((p) => p.id)) : new Set());
  };

  const selectedCount = selected.size;
  const allSelected = products.length > 0 && selectedCount === products.length;
  const someSelected = selectedCount > 0 && !allSelected;

  const confirmBulkDelete = async () => {
    setBulkWorking(true);
    try {
      const ids = Array.from(selected);
      const results = await Promise.allSettled(
        ids.map((id) =>
          fetch(`/api/admin/products/${id}`, { method: "DELETE" }).then(
            (res) => {
              if (!res.ok) throw new Error(`Failed to delete ${id}`);
              return res;
            },
          ),
        ),
      );
      const failed = results.filter((r) => r.status === "rejected").length;
      if (failed > 0) {
        toast.error(`${failed} of ${ids.length} products failed to delete`);
      } else {
        toast.success(`${ids.length} products deleted`);
      }
      setSelected(new Set());
      setBulkDeleteOpen(false);
      router.refresh();
    } catch {
      toast.error("Failed to delete selected products");
    } finally {
      setBulkWorking(false);
    }
  };

  const bulkSetPublished = async (isPublished: boolean) => {
    setBulkWorking(true);
    try {
      const ids = Array.from(selected);
      const results = await Promise.allSettled(
        ids.map((id) =>
          fetch(`/api/admin/products/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isPublished }),
          }),
        ),
      );
      const failed = results.filter((r) => r.status === "rejected").length;
      if (failed > 0) {
        toast.error(`${failed} of ${ids.length} products failed to update`);
      } else {
        toast.success(
          `${ids.length} products ${isPublished ? "published" : "unpublished"}`,
        );
      }
      router.refresh();
    } catch {
      toast.error("Failed to update selected products");
    } finally {
      setBulkWorking(false);
    }
  };

  const formatPrice = (cents: number) => {
    return `₹${(cents / 100).toLocaleString("en-IN")}`;
  };

  return (
    <div className={css({ display: "flex", flexDirection: "column", gap: "4" })}>
      {/* Filters */}
      <div
        className={css({
          display: "flex",
          flexDirection: "column",
          gap: "3",
          borderRadius: "xl",
          border: "1px solid",
          borderColor: "border.subtle",
          background: "bg.surface",
          padding: "3",
          md: { flexDirection: "row", alignItems: "center" },
        })}
      >
        <div className={css({ position: "relative", minWidth: 0, flex: "1" })}>
          <Search
            className={css({
              position: "absolute",
              left: "3",
              top: "50%",
              transform: "translateY(-50%)",
              height: "4",
              width: "4",
              color: "fg.muted",
              pointerEvents: "none",
            })}
          />
          <Input
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className={css({ paddingLeft: "9" })}
          />
        </div>

        <Select value={category} onValueChange={handleCategoryChange}>
          <SelectTrigger className={css({ width: "full", md: { width: "52" } })}>
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sort} onValueChange={handleSortChange}>
          <SelectTrigger className={css({ width: "full", md: { width: "44" } })}>
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="createdAt">Newest First</SelectItem>
            <SelectItem value="name_asc">Name (A-Z)</SelectItem>
            <SelectItem value="name_desc">Name (Z-A)</SelectItem>
            <SelectItem value="price_asc">Price (Low-High)</SelectItem>
            <SelectItem value="price_desc">Price (High-Low)</SelectItem>
            <SelectItem value="stock_asc">Stock (Low-High)</SelectItem>
            <SelectItem value="stock_desc">Stock (High-Low)</SelectItem>
          </SelectContent>
        </Select>

        <Button onClick={handleSearch} className={css({ width: "full", md: { width: "auto" } })}>
          Search
        </Button>

        <Button
          variant={grouped ? "default" : "outline"}
          onClick={toggleGrouped}
          className={css({ width: "full", md: { width: "auto" } })}
        >
          <Layers className={css({ height: "4", width: "4" })} />
          Group by category
        </Button>
      </div>

      {/* Bulk action bar */}
      {selectedCount > 0 && (
        <div
          className={css({
            display: "flex",
            flexDirection: "column",
            gap: "3",
            borderRadius: "xl",
            border: "1px solid",
            borderColor: "accent.default",
            background: "gold.50",
            padding: "3",
            md: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
          })}
        >
          <span className={css({ fontSize: "sm", fontWeight: "medium", color: "fg.default" })}>
            {selectedCount} product{selectedCount > 1 ? "s" : ""} selected
          </span>
          <div className={css({ display: "flex", flexWrap: "wrap", gap: "2" })}>
            <Button
              variant="outline"
              size="sm"
              disabled={bulkWorking}
              onClick={() => bulkSetPublished(true)}
            >
              {bulkWorking && <Loader2 className={css({ height: "3.5", width: "3.5", animation: "spin" })} />}
              Publish
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={bulkWorking}
              onClick={() => bulkSetPublished(false)}
            >
              Unpublish
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={bulkWorking}
              onClick={() => setBulkDeleteOpen(true)}
            >
              <Trash2 className={css({ height: "3.5", width: "3.5" })} />
              Delete
            </Button>
          </div>
        </div>
      )}

      {/* Mobile card list — no horizontal scroll, one product per card */}
      <div className={css({ display: { base: "flex", md: "none" }, flexDirection: "column", gap: "3" })}>
        {products.length === 0 ? (
          <div
            className={css({
              borderRadius: "xl",
              border: "1px solid",
              borderColor: "border.subtle",
              background: "bg.surface",
              padding: "8",
              textAlign: "center",
              color: "fg.muted",
            })}
          >
            No products found
          </div>
        ) : (
          productGroups.map((group) => (
            <div
              key={group.category?.id ?? "all"}
              className={css({ display: "flex", flexDirection: "column", gap: "3" })}
            >
              {group.category && (
                <button
                  type="button"
                  onClick={() => toggleCategoryCollapsed(group.category!.id)}
                  className={css({
                    display: "flex",
                    alignItems: "center",
                    gap: "2",
                    fontWeight: "semibold",
                    color: "fg.default",
                    cursor: "pointer",
                  })}
                >
                  <ChevronDown
                    className={css({
                      height: "4",
                      width: "4",
                      transition: "transform 0.15s ease",
                      transform: collapsedCategories.has(group.category.id) ? "rotate(-90deg)" : "none",
                    })}
                  />
                  {group.category.name}
                  <Badge variant="outline">{group.items.length}</Badge>
                </button>
              )}
              {!(group.category && collapsedCategories.has(group.category.id)) &&
                group.items.map((product) => (
            <div
              key={product.id}
              onClick={() => router.push(`/admin/products/${product.id}/edit`)}
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
                <Checkbox
                  aria-label={`Select ${product.name}`}
                  isSelected={selected.has(product.id)}
                  onChange={(isSelected) => toggleSelected(product.id, isSelected)}
                  onClick={(e) => e.stopPropagation()}
                  className={css({ marginTop: "1" })}
                />
                {product.images[0] ? (
                  <Image
                    src={product.images[0].url}
                    alt={product.images[0].alt || product.name}
                    width={56}
                    height={56}
                    className={css({ borderRadius: "md", objectFit: "cover", flexShrink: 0 })}
                  />
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
                  <p className={css({ fontSize: "xs", color: "fg.muted" })}>{product.category.name}</p>
                  <div className={css({ display: "flex", alignItems: "baseline", gap: "2", marginTop: "1" })}>
                    <span className={css({ fontWeight: "medium" })}>{formatPrice(product.priceCents)}</span>
                    {product.compareAtCents && (
                      <span className={css({ fontSize: "xs", color: "fg.muted", textDecoration: "line-through" })}>
                        {formatPrice(product.compareAtCents)}
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
                    onClick={() => setDeleteTarget(product)}
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
                    onClick={() => decrementStock(product.id, product.stock)}
                  >
                    <Minus className={css({ height: "3", width: "3" })} />
                  </Button>
                  <Input
                    type="number"
                    min="0"
                    value={
                      editingStock[product.id] !== undefined
                        ? editingStock[product.id]
                        : product.stock
                    }
                    onChange={(e) => handleStockChange(product.id, e.target.value)}
                    onBlur={() => handleStockBlur(product.id, product.stock)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.currentTarget.blur();
                    }}
                    className={css({ height: "7", width: "16", textAlign: "center", paddingInline: "1" })}
                  />
                  <Button
                    variant="outline"
                    size="icon-sm"
                    onClick={() => incrementStock(product.id, product.stock)}
                  >
                    <Plus className={css({ height: "3", width: "3" })} />
                  </Button>
                  <Badge
                    variant={
                      product.stock > 10 ? "default" : product.stock > 0 ? "outline" : "destructive"
                    }
                  >
                    {product.stock > 10 ? "In Stock" : product.stock > 0 ? "Low" : "Out"}
                  </Badge>
                </div>
                <Badge variant={product.isPublished ? "default" : "secondary"}>
                  {product.isPublished ? "Published" : "Draft"}
                </Badge>
              </div>
            </div>
                ))}
            </div>
          ))
        )}
      </div>

      {/* Table — desktop/tablet only */}
      <div
        className={css({
          display: { base: "none", md: "block" },
          overflow: "hidden",
          borderRadius: "xl",
          border: "1px solid",
          borderColor: "border.subtle",
          background: "bg.surface",
        })}
      >
        <div className={css({ overflowX: "auto" })}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className={css({ width: "10" })}>
                  <Checkbox
                    aria-label="Select all products"
                    isSelected={allSelected}
                    isIndeterminate={someSelected}
                    onChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead className={css({ width: "20" })}>Image</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className={css({ textAlign: "right" })}>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className={css({ textAlign: "center", paddingBlock: "8", color: "fg.muted" })}
                  >
                    No products found
                  </TableCell>
                </TableRow>
              ) : (
                productGroups.map((group) => (
                  <Fragment key={group.category?.id ?? "all"}>
                    {group.category && (
                      <TableRow
                        onClick={() => toggleCategoryCollapsed(group.category!.id)}
                        className={css({ cursor: "pointer", background: "bg.canvas" })}
                      >
                        <TableCell colSpan={8}>
                          <div className={css({ display: "flex", alignItems: "center", gap: "2", fontWeight: "semibold" })}>
                            <ChevronDown
                              className={css({
                                height: "4",
                                width: "4",
                                transition: "transform 0.15s ease",
                                transform: collapsedCategories.has(group.category.id)
                                  ? "rotate(-90deg)"
                                  : "none",
                              })}
                            />
                            {group.category.name}
                            <Badge variant="outline">{group.items.length}</Badge>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                    {!(group.category && collapsedCategories.has(group.category.id)) &&
                      group.items.map((product) => (
                  <TableRow
                    key={product.id}
                    onClick={() => router.push(`/admin/products/${product.id}/edit`)}
                    className={css({ cursor: "pointer" })}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        aria-label={`Select ${product.name}`}
                        isSelected={selected.has(product.id)}
                        onChange={(isSelected) => toggleSelected(product.id, isSelected)}
                      />
                    </TableCell>
                    <TableCell>
                      {product.images[0] ? (
                        <Image
                          src={product.images[0].url}
                          alt={product.images[0].alt || product.name}
                          width={50}
                          height={50}
                          className={css({ borderRadius: "md", objectFit: "cover" })}
                        />
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
                    <TableCell className={css({ fontWeight: "medium" })}>
                      {product.name}
                    </TableCell>
                    <TableCell>{product.category.name}</TableCell>
                    <TableCell>
                      <div className={css({ display: "flex", flexDirection: "column" })}>
                        <span>{formatPrice(product.priceCents)}</span>
                        {product.compareAtCents && (
                          <span
                            className={css({
                              fontSize: "xs",
                              color: "fg.muted",
                              textDecoration: "line-through",
                            })}
                          >
                            {formatPrice(product.compareAtCents)}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className={css({ display: "flex", alignItems: "center", gap: "1" })}>
                        <Button
                          variant="outline"
                          size="icon-sm"
                          onClick={() => decrementStock(product.id, product.stock)}
                        >
                          <Minus className={css({ height: "3", width: "3" })} />
                        </Button>
                        <Input
                          type="number"
                          min="0"
                          value={
                            editingStock[product.id] !== undefined
                              ? editingStock[product.id]
                              : product.stock
                          }
                          onChange={(e) => handleStockChange(product.id, e.target.value)}
                          onBlur={() => handleStockBlur(product.id, product.stock)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.currentTarget.blur();
                            }
                          }}
                          className={css({ height: "7", width: "16", textAlign: "center", paddingInline: "1" })}
                        />
                        <Button
                          variant="outline"
                          size="icon-sm"
                          onClick={() => incrementStock(product.id, product.stock)}
                        >
                          <Plus className={css({ height: "3", width: "3" })} />
                        </Button>
                        <Badge
                          variant={
                            product.stock > 10
                              ? "default"
                              : product.stock > 0
                                ? "outline"
                                : "destructive"
                          }
                          className={css({ marginLeft: "1" })}
                        >
                          {product.stock > 10 ? "In Stock" : product.stock > 0 ? "Low" : "Out"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={product.isPublished ? "default" : "secondary"}>
                        {product.isPublished ? "Published" : "Draft"}
                      </Badge>
                    </TableCell>
                    <TableCell
                      className={css({ textAlign: "right" })}
                      onClick={(e) => e.stopPropagation()}
                    >
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
                          onClick={() => setDeleteTarget(product)}
                        >
                          <Trash2 className={css({ height: "4", width: "4", color: "danger" })} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                      ))}
                  </Fragment>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination — grouped view loads every matching product at once */}
      {!grouped && pagination.totalCount > 0 && (
        <div
          className={css({
            display: "flex",
            flexDirection: "column",
            gap: "3",
            md: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
          })}
        >
          <p className={css({ fontSize: "sm", color: "fg.muted" })}>
            Showing {(pagination.page - 1) * pagination.pageSize + 1}–
            {Math.min(pagination.page * pagination.pageSize, pagination.totalCount)}{" "}
            of {pagination.totalCount} products
          </p>
          <div className={css({ display: "flex", alignItems: "center", gap: "2" })}>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => goToPage(pagination.page - 1)}
            >
              <ChevronLeft className={css({ height: "4", width: "4" })} />
              Previous
            </Button>
            <span className={css({ fontSize: "sm", color: "fg.muted", paddingInline: "2" })}>
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => goToPage(pagination.page + 1)}
            >
              Next
              <ChevronRight className={css({ height: "4", width: "4" })} />
            </Button>
          </div>
        </div>
      )}

      {/* Delete confirm dialog (single product) */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete product?</DialogTitle>
            <DialogDescription>
              {deleteTarget
                ? `"${deleteTarget.name}" will be permanently deleted, unless it has existing orders in which case it will be archived instead. This cannot be undone.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
              {deleting && <Loader2 className={css({ height: "4", width: "4", animation: "spin" })} />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk delete confirm dialog */}
      <Dialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {selectedCount} products?</DialogTitle>
            <DialogDescription>
              Products with existing orders will be archived instead of deleted. This cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDeleteOpen(false)} disabled={bulkWorking}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmBulkDelete} disabled={bulkWorking}>
              {bulkWorking && <Loader2 className={css({ height: "4", width: "4", animation: "spin" })} />}
              Delete {selectedCount}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
