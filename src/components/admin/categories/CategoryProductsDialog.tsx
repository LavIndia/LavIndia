"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { ChevronLeft, ChevronRight, Loader2, Search, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { css } from "styled-system/css";
import {
  ProductTableRow,
  ProductMobileCard,
  type ProductListItemProduct,
} from "@/components/admin/products/ProductListItem";
import { useProductStockEditor } from "@/components/admin/products/useProductStockEditor";
import { useProductPublishToggle } from "@/components/admin/products/useProductPublishToggle";
import Link from "next/link";
import { ProductDeleteDialog } from "@/components/admin/products/ProductDeleteDialogs";

interface CategoryProductsDialogProps {
  category: { id: string; name: string } | null;
  onOpenChange: (open: boolean) => void;
}

const modalStyle = css({ maxWidth: { base: "full", lg: "64rem" } });

export function CategoryProductsDialog({ category, onOpenChange }: CategoryProductsDialogProps) {
  const router = useRouter();
  const [products, setProducts] = useState<ProductListItemProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("createdAt");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalCount: 0, totalPages: 1, pageSize: 20 });
  const [deleteTarget, setDeleteTarget] = useState<ProductListItemProduct | null>(null);
  const {
    editingStock,
    handleStockChange,
    handleStockBlur,
    incrementStock,
    decrementStock,
  } = useProductStockEditor(() => fetchProducts());
  const { togglingId: togglingPublishedId, togglePublished } = useProductPublishToggle(() =>
    fetchProducts(),
  );

  const open = !!category;

  // Reset paging/search state each time a different category is opened.
  useEffect(() => {
    if (category) {
      setSearch("");
      setSort("createdAt");
      setPage(1);
    }
  }, [category?.id]);

  async function fetchProducts() {
    if (!category) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        categoryId: category.id,
        sort,
        page: String(page),
      });
      if (search) params.set("search", search);

      const res = await fetch(`/api/admin/products?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load products");
      const data = await res.json();
      setProducts(data.products);
      setPagination(data.pagination);
    } catch {
      toast.error("Failed to load products for this category");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open) fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, category?.id, sort, page]);

  const handleSearchSubmit = () => {
    setPage(1);
    fetchProducts();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => !next && onOpenChange(false)}>
        <DialogContent className={modalStyle}>
          <DialogHeader>
            <DialogTitle>{category?.name} products</DialogTitle>
            <DialogDescription>
              {pagination.totalCount} product{pagination.totalCount === 1 ? "" : "s"} in this category
            </DialogDescription>
          </DialogHeader>

          <div
            className={css({
              display: "flex",
              flexDirection: "column",
              gap: "3",
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
                placeholder="Search products in this category..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearchSubmit()}
                className={css({ paddingLeft: "9" })}
              />
            </div>
            <Select
              value={sort}
              onValueChange={(value) => {
                setSort(value);
                setPage(1);
              }}
            >
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
            <Button onClick={handleSearchSubmit} className={css({ width: "full", md: { width: "auto" } })}>
              Search
            </Button>
          </div>

          {loading ? (
            <div className={css({ display: "flex", justifyContent: "center", paddingBlock: "10" })}>
              <Loader2 className={css({ height: "6", width: "6", animation: "spin", color: "fg.muted" })} />
            </div>
          ) : products.length === 0 ? (
            <div
              className={css({
                borderRadius: "xl",
                border: "1px solid",
                borderColor: "border.subtle",
                padding: "8",
                textAlign: "center",
                color: "fg.muted",
              })}
            >
              No products found
            </div>
          ) : (
            <>
              {/* Mobile cards */}
              <div className={css({ display: { base: "flex", md: "none" }, flexDirection: "column", gap: "3" })}>
                {products.map((product) => (
                  <ProductMobileCard
                    key={product.id}
                    product={product}
                    selected={false}
                    onToggleSelected={() => {}}
                    editingStock={editingStock[product.id]}
                    onStockChange={handleStockChange}
                    onStockBlur={handleStockBlur}
                    onIncrementStock={incrementStock}
                    onDecrementStock={decrementStock}
                    onDeleteClick={setDeleteTarget}
                    onRowClick={(p) => router.push(`/admin/products/${p.id}/edit`)}
                    onTogglePublished={(p) => togglePublished(p.id, p.isPublished)}
                    togglingPublishedId={togglingPublishedId}
                    showCategory={false}
                    showCheckbox={false}
                  />
                ))}
              </div>

              {/* Desktop table */}
              <div
                className={css({
                  display: { base: "none", md: "block" },
                  overflow: "hidden",
                  borderRadius: "xl",
                  border: "1px solid",
                  borderColor: "border.subtle",
                })}
              >
                <div className={css({ overflowX: "auto" })}>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className={css({ width: "20" })}>Image</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Stock</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className={css({ textAlign: "right" })}>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.map((product) => (
                        <ProductTableRow
                          key={product.id}
                          product={product}
                          selected={false}
                          onToggleSelected={() => {}}
                          editingStock={editingStock[product.id]}
                          onStockChange={handleStockChange}
                          onStockBlur={handleStockBlur}
                          onIncrementStock={incrementStock}
                          onDecrementStock={decrementStock}
                          onDeleteClick={setDeleteTarget}
                          onRowClick={(p) => router.push(`/admin/products/${p.id}/edit`)}
                          onTogglePublished={(p) => togglePublished(p.id, p.isPublished)}
                          togglingPublishedId={togglingPublishedId}
                          showCategory={false}
                          showCheckbox={false}
                        />
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </>
          )}

          {pagination.totalPages > 1 && (
            <div className={css({ display: "flex", alignItems: "center", justifyContent: "center", gap: "2" })}>
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className={css({ height: "4", width: "4" })} />
                Previous
              </Button>
              <span className={css({ fontSize: "sm", color: "fg.muted", paddingInline: "2" })}>
                Page {page} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= pagination.totalPages || loading}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
                <ChevronRight className={css({ height: "4", width: "4" })} />
              </Button>
            </div>
          )}

          <DialogFooter>
            {category && (
              <Button variant="outline" asChild>
                <Link href={`/admin/products?category=${category.id}`}>
                  <ExternalLink className={css({ height: "4", width: "4" })} />
                  Open in Products page
                </Link>
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ProductDeleteDialog
        product={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onDone={async () => {
          setDeleteTarget(null);
          await fetchProducts();
          router.refresh();
        }}
      />
    </>
  );
}
