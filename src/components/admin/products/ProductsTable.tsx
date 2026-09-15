"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Pencil,
  Trash2,
  Search,
  Plus,
  Minus,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

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
  const [editingStock, setEditingStock] = useState<{
    [key: string]: number;
  }>({});

  const applyFilters = (
    searchValue?: string,
    categoryValue?: string,
    sortValue?: string,
    pageValue?: number,
  ) => {
    const params = new URLSearchParams();
    const finalSearch = searchValue ?? search;
    const finalCategory = categoryValue ?? category;
    const finalSort = sortValue ?? sort;

    if (finalSearch) params.set("search", finalSearch);
    if (finalCategory !== "all") params.set("category", finalCategory);
    if (finalSort) params.set("sort", finalSort);
    if (pageValue && pageValue > 1) params.set("page", String(pageValue));
    router.push(`/admin/products?${params.toString()}`);
  };

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

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;

    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete");

      toast.success("Product deleted successfully");
      router.refresh();
    } catch {
      toast.error("Failed to delete product");
    }
  };

  const formatPrice = (cents: number) => {
    return `₹${(cents / 100).toLocaleString("en-IN")}`;
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-3 shadow-sm sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="pl-9"
          />
        </div>

        <Select value={category} onValueChange={handleCategoryChange}>
          <SelectTrigger className="w-full sm:w-[200px]">
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
          <SelectTrigger className="w-full sm:w-[180px]">
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

        <Button onClick={handleSearch} className="w-full sm:w-auto">
          Search
        </Button>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Image</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No products found
                  </TableCell>
                </TableRow>
              ) : (
                products.map((product) => (
                  <TableRow
                    key={product.id}
                    className="group hover:bg-muted/40"
                  >
                    <TableCell>
                      {product.images[0] ? (
                        <Image
                          src={product.images[0].url}
                          alt={product.images[0].alt || product.name}
                          width={50}
                          height={50}
                          className="rounded object-cover"
                        />
                      ) : (
                        <div className="w-[50px] h-[50px] bg-gray-100 rounded flex items-center justify-center text-xs text-gray-400">
                          No image
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      {product.name}
                    </TableCell>
                    <TableCell>{product.category.name}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{formatPrice(product.priceCents)}</span>
                        {product.compareAtCents && (
                          <span className="text-xs text-muted-foreground line-through">
                            {formatPrice(product.compareAtCents)}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() =>
                            decrementStock(product.id, product.stock)
                          }
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <Input
                          type="number"
                          min="0"
                          value={
                            editingStock[product.id] !== undefined
                              ? editingStock[product.id]
                              : product.stock
                          }
                          onChange={(e) =>
                            handleStockChange(product.id, e.target.value)
                          }
                          onBlur={() =>
                            handleStockBlur(product.id, product.stock)
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.currentTarget.blur();
                            }
                          }}
                          className="h-7 w-16 text-center"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() =>
                            incrementStock(product.id, product.stock)
                          }
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Badge
                          variant={
                            product.stock > 10
                              ? "default"
                              : product.stock > 0
                                ? "outline"
                                : "destructive"
                          }
                          className="ml-1"
                        >
                          {product.stock > 10
                            ? "In Stock"
                            : product.stock > 0
                              ? "Low"
                              : "Out"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={product.isPublished ? "default" : "secondary"}
                      >
                        {product.isPublished ? "Published" : "Draft"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/admin/products/${product.id}/edit`}>
                          <Button variant="ghost" size="icon">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(product.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      {pagination.totalCount > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(pagination.page - 1) * pagination.pageSize + 1}–
            {Math.min(
              pagination.page * pagination.pageSize,
              pagination.totalCount,
            )}{" "}
            of {pagination.totalCount} products
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => goToPage(pagination.page - 1)}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <span className="text-sm text-muted-foreground px-2">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => goToPage(pagination.page + 1)}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
