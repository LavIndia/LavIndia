"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { parse } from "papaparse";

interface ProductRow {
  name: string;
  slug: string;
  description?: string;
  price: string;
  compareAtPrice?: string;
  stock: string;
  category: string;
  sku?: string;
  isPublished?: string;
}

interface ValidationResult {
  row: number;
  data: ProductRow;
  errors: string[];
  warnings: string[];
}

export default function BulkUploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ValidationResult[]>([]);
  const [uploading, setUploading] = useState(false);
  const [categories, setCategories] = useState<Record<string, string>>({});

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);

    // Fetch categories for validation
    const res = await fetch("/api/admin/categories");
    const cats = await res.json();
    const catMap = Object.fromEntries(
      cats.map((c: { id: string; name: string }) => [
        c.name.toLowerCase(),
        c.id,
      ])
    );
    setCategories(catMap);

    // Parse CSV
    parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const validated = validateRows(results.data as ProductRow[], catMap);
        setPreview(validated);
      },
      error: () => {
        toast.error("Failed to parse CSV file");
      },
    });
  };

  const validateRows = (
    rows: ProductRow[],
    catMap: Record<string, string>
  ): ValidationResult[] => {
    return rows.map((row, index) => {
      const errors: string[] = [];
      const warnings: string[] = [];

      // Required fields
      if (!row.name?.trim()) errors.push("Name is required");
      if (!row.slug?.trim()) errors.push("Slug is required");
      if (!row.price || isNaN(parseFloat(row.price)))
        errors.push("Valid price required");
      if (!row.stock || isNaN(parseInt(row.stock)))
        errors.push("Valid stock required");
      if (!row.category?.trim()) errors.push("Category is required");

      // Category validation
      if (row.category && !catMap[row.category.toLowerCase()]) {
        errors.push(`Category "${row.category}" not found`);
      }

      // Warnings
      if (
        row.compareAtPrice &&
        parseFloat(row.compareAtPrice) < parseFloat(row.price)
      ) {
        warnings.push("Compare price should be higher than price");
      }

      if (!row.description) warnings.push("No description");

      return { row: index + 1, data: row, errors, warnings };
    });
  };

  const handleUpload = async () => {
    setUploading(true);

    try {
      const validRows = preview.filter((v) => v.errors.length === 0);

      if (validRows.length === 0) {
        toast.error("No valid rows to upload");
        return;
      }

      const products = validRows.map((v) => ({
        name: v.data.name,
        slug: v.data.slug,
        description: v.data.description || null,
        priceCents: Math.round(parseFloat(v.data.price) * 100),
        compareAtCents: v.data.compareAtPrice
          ? Math.round(parseFloat(v.data.compareAtPrice) * 100)
          : null,
        stock: parseInt(v.data.stock),
        categoryId: categories[v.data.category.toLowerCase()],
        sku: v.data.sku || null,
        isPublished: v.data.isPublished?.toLowerCase() === "true",
        isFeatured: false,
        discountPercent: null,
      }));

      const res = await fetch("/api/admin/products/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ products }),
      });

      if (!res.ok) throw new Error("Upload failed");

      const result = await res.json();

      toast.success(
        `Successfully imported ${result.success} products. ${result.failed} failed.`
      );

      router.push("/admin/products");
      router.refresh();
    } catch {
      toast.error("Failed to import products");
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    const template = `name,slug,description,price,compareAtPrice,stock,category,sku,isPublished
"Gold Necklace","gold-necklace","Beautiful gold necklace",15999.00,17999.00,10,"Necklaces","NECK-001",true
"Diamond Ring","diamond-ring","Elegant diamond ring",25999.00,,5,"Rings","RING-001",true
"Pearl Earrings","pearl-earrings","Classic pearl earrings",5999.00,6999.00,15,"Earrings","EAR-001",false`;

    const blob = new Blob([template], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "product-import-template.csv";
    a.click();
  };

  const validCount = preview.filter((v) => v.errors.length === 0).length;
  const errorCount = preview.filter((v) => v.errors.length > 0).length;

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Bulk Upload Products
        </h1>
        <p className="text-muted-foreground mt-2">
          Import multiple products at once using a CSV file
        </p>
      </div>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Instructions</CardTitle>
          <CardDescription>How to prepare your CSV file</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Download the CSV template below</li>
            <li>
              Fill in your product data (name, slug, price, stock, category are
              required)
            </li>
            <li>
              Category must exactly match an existing category name
              (case-insensitive)
            </li>
            <li>Prices should be in rupees (e.g., 15999.00 for ₹15,999)</li>
            <li>Upload your file and review the preview</li>
            <li>Fix any errors, then click Import</li>
          </ol>

          <Button variant="outline" onClick={downloadTemplate}>
            <Download className="h-4 w-4 mr-2" />
            Download Template
          </Button>
        </CardContent>
      </Card>

      {/* Upload */}
      <Card>
        <CardHeader>
          <CardTitle>Upload CSV File</CardTitle>
        </CardHeader>
        <CardContent>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="hidden"
          />

          {!file ? (
            <div
              className="border-2 border-dashed rounded-lg p-12 text-center cursor-pointer hover:bg-muted/50 transition"
              onClick={() => fileInputRef.current?.click()}
            >
              <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-lg font-medium mb-1">
                Click to upload CSV file
              </p>
              <p className="text-sm text-muted-foreground">
                Or drag and drop your file here
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <Alert>
                <Upload className="h-4 w-4" />
                <AlertDescription>
                  File: <strong>{file.name}</strong> ({preview.length} rows)
                </AlertDescription>
              </Alert>

              {preview.length > 0 && (
                <div className="flex items-center gap-4">
                  <Badge variant="default" className="gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    {validCount} Valid
                  </Badge>
                  {errorCount > 0 && (
                    <Badge variant="destructive" className="gap-1">
                      <XCircle className="h-3 w-3" />
                      {errorCount} Errors
                    </Badge>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview */}
      {preview.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Preview & Validation</CardTitle>
            <CardDescription>Review before importing</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border max-h-[500px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Row</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.slice(0, 50).map((v) => (
                    <TableRow key={v.row}>
                      <TableCell>{v.row}</TableCell>
                      <TableCell className="font-medium">
                        {v.data.name}
                      </TableCell>
                      <TableCell>{v.data.category}</TableCell>
                      <TableCell>
                        ₹{parseFloat(v.data.price).toLocaleString()}
                      </TableCell>
                      <TableCell>{v.data.stock}</TableCell>
                      <TableCell>
                        {v.errors.length > 0 ? (
                          <div className="space-y-1">
                            <Badge variant="destructive">Errors</Badge>
                            {v.errors.map((err, i) => (
                              <p key={i} className="text-xs text-red-600">
                                {err}
                              </p>
                            ))}
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <Badge variant="default">Valid</Badge>
                            {v.warnings.map((warn, i) => (
                              <p key={i} className="text-xs text-yellow-600">
                                ⚠️ {warn}
                              </p>
                            ))}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {preview.length > 50 && (
              <p className="text-sm text-muted-foreground mt-2">
                Showing first 50 rows of {preview.length}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      {preview.length > 0 && (
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => {
              setFile(null);
              setPreview([]);
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={uploading || validCount === 0}
          >
            {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Import {validCount} Products
          </Button>
        </div>
      )}
    </div>
  );
}
