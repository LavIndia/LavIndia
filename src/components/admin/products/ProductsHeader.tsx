"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus, Download, Upload } from "lucide-react";

export function ProductsHeader() {
  const handleExport = () => {
    window.location.href = "/api/admin/export?type=products";
  };

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Products</h1>
        <p className="text-muted-foreground mt-2">
          Manage your product catalog
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
        <Link href="/admin/products/bulk-upload">
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Bulk Upload
          </Button>
        </Link>
        <Link href="/admin/products/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        </Link>
      </div>
    </div>
  );
}
