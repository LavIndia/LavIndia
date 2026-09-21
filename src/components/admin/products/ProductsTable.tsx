"use client";

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { ProductsFilterBar } from "@/components/admin/products/ProductsFilterBar";
import { css } from "styled-system/css";
import {
  ProductTableRow,
  ProductMobileCard,
  type ProductListItemProduct,
} from "./ProductListItem";
import { useProductStockEditor } from "./useProductStockEditor";
import { useProductPublishToggle } from "./useProductPublishToggle";

type Product = ProductListItemProduct;

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
  const {
    editingStock,
    handleStockChange,
    handleStockBlur,
    incrementStock,
    decrementStock,
  } = useProductStockEditor(() => router.refresh());
  const { togglingId: togglingPublishedId, togglePublished } = useProductPublishToggle(() =>
    router.refresh(),
  );
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

  return (
    <div className={css({ display: "flex", flexDirection: "column", gap: "4" })}>
      <ProductsFilterBar
        search={search}
        onSearchChange={setSearch}
        onSubmit={handleSearch}
        category={category}
        onCategoryChange={handleCategoryChange}
        sort={sort}
        onSortChange={handleSortChange}
        grouped={grouped}
        onToggleGrouped={toggleGrouped}
        categories={categories}
      />

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
                  <ProductMobileCard
                    key={product.id}
                    product={product}
                    selected={selected.has(product.id)}
                    onToggleSelected={toggleSelected}
                    editingStock={editingStock[product.id]}
                    onStockChange={handleStockChange}
                    onStockBlur={handleStockBlur}
                    onIncrementStock={incrementStock}
                    onDecrementStock={decrementStock}
                    onDeleteClick={setDeleteTarget}
                    onRowClick={(p) => router.push(`/admin/products/${p.id}/edit`)}
                    onTogglePublished={(p) => togglePublished(p.id, p.isPublished)}
                    togglingPublishedId={togglingPublishedId}
                  />
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
                        <ProductTableRow
                          key={product.id}
                          product={product}
                          selected={selected.has(product.id)}
                          onToggleSelected={toggleSelected}
                          editingStock={editingStock[product.id]}
                          onStockChange={handleStockChange}
                          onStockBlur={handleStockBlur}
                          onIncrementStock={incrementStock}
                          onDecrementStock={decrementStock}
                          onDeleteClick={setDeleteTarget}
                          onRowClick={(p) => router.push(`/admin/products/${p.id}/edit`)}
                          onTogglePublished={(p) => togglePublished(p.id, p.isPublished)}
                          togglingPublishedId={togglingPublishedId}
                        />
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
