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
import { queueReceive, type ReceiveHandoffItem } from "@/lib/receive-handoff";
import { css } from "styled-system/css";
import { buildBulkVariants, splitMultiValue, splitTags } from "@/lib/product-bulk";
import { slugify } from "@/modules/catalog/products/slug";

interface ProductRow {
  id?: string;
  name: string;
  slug: string;
  description?: string;
  price: string;
  compareAtPrice?: string;
  costPrice?: string;
  quantity?: string;
  category: string;
  sku?: string;
  material?: string;
  tags?: string;
  colors?: string;
  sizes?: string;
  imagePaths?: string;
  isPublished?: string;
  isFeatured?: string;
  isLimitedEdition?: string;
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
  const [categories, setCategories] = useState<Record<string, { id: string; slug: string }>>({});
  const [imageFiles, setImageFiles] = useState<File[]>([]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);

    // Fetch categories for validation
    const res = await fetch("/api/admin/categories");
    if (!res.ok) {
      toast.error("Could not load categories");
      return;
    }
    const cats = await res.json();
    const catMap = Object.fromEntries(
      cats.map((c: { id: string; name: string; slug: string }) => [
        c.name.trim().toLowerCase(),
        { id: c.id, slug: c.slug },
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
      if (!row.category?.trim()) errors.push("Category is required");
      if (row.name?.trim().startsWith("SAMPLE ONLY -")) {
        errors.push("Sample row only — delete this row before importing");
      }

      // Quantity is not booked by this upload. It carries over to Receive
      // stock, where it is confirmed together with the supplier's bill.
      if (row.quantity?.trim() && !/^\d+$/.test(row.quantity.trim())) {
        errors.push("Quantity must be a whole number");
      }

      // Unknown categories are created automatically when the row is imported.
      if (row.category?.trim() && !catMap[row.category.trim().toLowerCase()]) {
        warnings.push(`New category "${row.category.trim()}" will be created`);
      }

      // Warnings
      if (
        row.compareAtPrice &&
        parseFloat(row.compareAtPrice) < parseFloat(row.price)
      ) {
        warnings.push("Compare price should be higher than price");
      }

      if (!row.description) warnings.push("No description");

      if (row.colors && splitMultiValue(row.colors).length === 0) {
        errors.push("Colour values must be comma-separated");
      }

      if (row.sizes && splitMultiValue(row.sizes).length === 0) {
        errors.push("Size values must be comma-separated");
      }

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

      const categoryIds = new Map<string, string>();
      const categoryMap = { ...categories };
      for (const { data } of validRows) {
        const name = data.category.trim();
        const key = name.trim().toLowerCase();
        let category = categoryMap[key];
        if (!category) {
          const base = slugify(name) || "category";
          const usedSlugs = new Set(Object.values(categoryMap).map((item) => item.slug));
          let slug = base;
          for (let suffix = 2; usedSlugs.has(slug); suffix++) slug = `${base}-${suffix}`;
          const createResponse = await fetch("/api/admin/categories", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, slug, isFeatured: false, featuredOrder: 0 }),
          });
          if (!createResponse.ok) throw new Error(`Could not create category: ${name}`);
          const created = await createResponse.json();
          category = { id: created.id, slug: created.slug };
          categoryMap[key] = category;
        }
        categoryIds.set(key, category.id);
      }
      setCategories(categoryMap);

      let success = 0;
      const failures: string[] = [];
      const toReceive: ReceiveHandoffItem[] = [];
      for (const { row, data } of validRows) {
        try {
          const categoryId = categoryIds.get(data.category.trim().toLowerCase());
          if (!categoryId) throw new Error("Category could not be resolved");

          const imageUrls: string[] = [];
          for (const pathOrFile of splitMultiValue(data.imagePaths)) {
            if (pathOrFile.startsWith("/") || /^https?:\/\//i.test(pathOrFile)) {
              imageUrls.push(pathOrFile);
              continue;
            }
            const filename = pathOrFile.split(/[\\/]/).pop()?.trim().toLowerCase();
            const matches = imageFiles.filter((image) => image.name.toLowerCase() === filename);
            if (matches.length !== 1) {
              throw new Error(`Select exactly one image file matching "${filename ?? pathOrFile}"`);
            }
            const formData = new FormData();
            formData.set("file", matches[0]);
            formData.set("productName", data.name);
            formData.set("categoryId", categoryId);
            const uploadResponse = await fetch("/api/admin/products/upload", {
              method: "POST",
              body: formData,
            });
            const uploaded = await uploadResponse.json();
            if (!uploadResponse.ok) throw new Error(uploaded.error || "Image upload failed");
            imageUrls.push(uploaded.url);
          }

          const variants = buildBulkVariants(data.colors, data.sizes);
          const quantity = parseInt(data.quantity?.trim() || "0", 10) || 0;
          const images = imageUrls.map((url, index) => ({
            url,
            alt: null,
            isPrimary: index === 0,
            position: index,
          }));
          const fields = {
            name: data.name.trim(),
            slug: data.slug.trim(),
            description: data.description || null,
            priceCents: Math.round(parseFloat(data.price) * 100),
            compareAtCents: data.compareAtPrice ? Math.round(parseFloat(data.compareAtPrice) * 100) : null,
            costCents: data.costPrice ? Math.round(parseFloat(data.costPrice) * 100) : null,
            categoryId,
            sku: data.sku || null,
            material: data.material || null,
            tags: splitTags(data.tags),
            isPublished: data.isPublished?.toLowerCase() === "true",
            isFeatured: data.isFeatured?.toLowerCase() === "true",
            isLimitedEdition: data.isLimitedEdition?.toLowerCase() === "true",
            images,
          };

          if (data.id?.trim()) {
            const productResponse = await fetch(`/api/admin/products/${encodeURIComponent(data.id.trim())}`);
            if (!productResponse.ok) throw new Error(`Product ID "${data.id}" was not found`);
            const existing = await productResponse.json();
            const oldVariants = existing.variants as Array<Record<string, unknown>>;
            const oldImages = existing.images as Array<Record<string, unknown>>;
            const variantsForUpdate = variants.length
              ? variants.map((variant) => {
                  const match = oldVariants.find((old) => old.color === variant.color && old.size === variant.size);
                  return { ...variant, id: match?.id as string | undefined, priceCents: (match?.priceCents as number | null | undefined) ?? null, stock: (match?.stock as number | undefined) ?? 0 };
                })
              : oldVariants.filter((variant) => variant.isDefault).map((variant) => ({
                  name: "Default", id: variant.id as string, color: null, size: null,
                  priceCents: (variant.priceCents as number | null | undefined) ?? null,
                  stock: (variant.stock as number | undefined) ?? 0,
                }));
            const imagesForUpdate = images.map((image) => {
              const match = oldImages.find((old) => old.url === image.url);
              return match
                ? {
                    ...image,
                    id: match.id as string,
                    optionDimension: match.optionDimension as "color" | "size" | "material" | null,
                    optionValue: match.optionValue as string | null,
                  }
                : image;
            });
            const updateResponse = await fetch(`/api/admin/products/${encodeURIComponent(data.id.trim())}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...fields, variants: variantsForUpdate, images: imagesForUpdate }),
            });
            if (!updateResponse.ok) {
              const problem = await updateResponse.json();
              throw new Error(problem.error || "Product update failed");
            }
            if (quantity > 0) toReceive.push({ productId: data.id.trim(), quantity });
          } else {
            const response = await fetch("/api/admin/products/bulk", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ products: [{ ...fields, stock: 0, categoryName: data.category.trim(), discountPercent: null, variants }] }),
            });
            const result = await response.json();
            if (!response.ok || result.failed) throw new Error(result.errors?.[0]?.error || "Product import failed");
            if (quantity > 0 && result.created?.[0]?.productId) {
              toReceive.push({ productId: result.created[0].productId, quantity });
            }
          }
          success++;
        } catch (error) {
          failures.push(`Row ${row}: ${error instanceof Error ? error.message : "Import failed"}`);
        }
      }

      if (failures.length) {
        toast.error(`${success} products saved; ${failures.length} failed. ${failures[0]}`);
      } else {
        toast.success(`${success} products saved`);
      }
      if (success > 0) {
        // Pieces with a quantity go straight to Receive stock, pre-filled, so
        // the delivery is confirmed once with its supplier and invoice.
        if (toReceive.length > 0) {
          queueReceive(toReceive);
          router.push("/admin/inventory/receive");
        } else {
          router.push("/admin/products");
        }
        router.refresh();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to import products");
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    const template = `id,name,slug,description,price,compareAtPrice,costPrice,quantity,category,sku,material,tags,colors,sizes,imagePaths,isPublished,isFeatured,isLimitedEdition
,"SAMPLE ONLY - Necklace (delete this row)",sample-necklace,"Example: lightweight gold-plated necklace",1599.00,1999.00,650.00,10,Necklaces,SAMPLE-NECK-001,"Gold Plated Brass",festive-edit|gift-under-2k,"Gold, Rose Gold","16 inch, 18 inch","front.jpg, side.jpg",false,false,false
,"SAMPLE ONLY - Ring (delete this row)",sample-ring,"Example: adjustable silver ring",899.00,,300.00,5,Rings,SAMPLE-RING-001,"Silver plated alloy",everyday,"Silver","6, 7, 8","ring.jpg",false,true,false`;

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
    <div className={css({ maxWidth: "6xl", display: "flex", flexDirection: "column", gap: "6" })}>
      <div>
        <h1
          className={css({
            fontFamily: "display",
            fontSize: { base: "2xl", md: "3xl" },
            fontWeight: "bold",
            letterSpacing: "tight",
            color: "fg.default",
          })}
        >
          Bulk Upload Products
        </h1>
        <p className={css({ color: "fg.muted", marginTop: "2", fontSize: "sm" })}>
          Import multiple products at once using a CSV file
        </p>
      </div>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Instructions</CardTitle>
          <CardDescription>How to prepare your CSV file</CardDescription>
        </CardHeader>
        <CardContent className={css({ display: "flex", flexDirection: "column", gap: "4" })}>
          <ol
            className={css({
              listStyleType: "decimal",
              listStylePosition: "inside",
              display: "flex",
              flexDirection: "column",
              gap: "2",
              fontSize: "sm",
              color: "fg.default",
            })}
          >
            <li>Download the CSV template below</li>
            <li>
              Fill in your product data. Name, price, and category are required.
            </li>
            <li>
              Product IDs are generated automatically for new products. Leave id blank; only keep the id when re-importing an exported product to update it.
            </li>
            <li>
              The downloaded template includes sample rows for reference. Delete those rows before importing; they are intentionally marked invalid.
            </li>
            <li>
              Existing categories match case-insensitively; new category names
              are created automatically during import.
            </li>
            <li>
              Use commas for multi-select values, such as &quot;Gold, Silver&quot;
              or &quot;6, 7, 8&quot;. Keep the quotes in CSV cells containing commas.
            </li>
            <li>
              In imagePaths, use selected image filenames (comma-separated in
              one quoted cell) to upload local files to ImageKit. Existing
              public paths and URLs can also be used directly.
            </li>
            <li>
              Add a quantity column if stock arrived with these pieces. After
              the import you go to Receive stock with them pre-filled, to add
              the supplier and bill and confirm. Pieces with colours or sizes
              get the quantity for each variant — adjust it there.
            </li>
            <li>Prices should be in rupees (e.g., 15999.00 for ₹15,999)</li>
            <li>Upload your file and review the preview</li>
            <li>Fix any errors, then click Import</li>
          </ol>

          <Button variant="outline" onClick={downloadTemplate}>
            <Download className={css({ height: "4", width: "4" })} />
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
            accept=".csv,text/csv,text/comma-separated-values,application/csv,application/vnd.ms-excel,text/plain"
            onChange={handleFileSelect}
            className={css({ srOnly: true })}
          />

          <div className={css({ marginTop: "4", display: "flex", flexDirection: "column", gap: "2" })}>
            <label htmlFor="bulk-product-images" className={css({ fontSize: "sm", fontWeight: "medium" })}>
              Product images (optional; selected files upload to ImageKit)
            </label>
            <input
              id="bulk-product-images"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={(event) => setImageFiles(Array.from(event.target.files ?? []))}
            />
            {imageFiles.length > 0 && (
              <p className={css({ fontSize: "sm", color: "fg.muted" })}>
                {imageFiles.length} image file{imageFiles.length === 1 ? "" : "s"} selected
              </p>
            )}
          </div>

          {!file ? (
            <div
              className={css({
                border: "2px dashed",
                borderColor: "border.subtle",
                borderRadius: "lg",
                padding: "12",
                textAlign: "center",
                cursor: "pointer",
                transition: "background 0.15s ease",
                "&:hover": { background: "bg.canvas" },
              })}
              onClick={() => fileInputRef.current?.click()}
            >
              <FileSpreadsheet
                className={css({
                  height: "12",
                  width: "12",
                  marginInline: "auto",
                  color: "fg.muted",
                  marginBottom: "3",
                })}
              />
              <p className={css({ fontSize: "lg", fontWeight: "medium", marginBottom: "1", color: "fg.default" })}>
                Click to upload CSV file
              </p>
              <p className={css({ fontSize: "sm", color: "fg.muted" })}>
                Or drag and drop your file here
              </p>
            </div>
          ) : (
            <div className={css({ display: "flex", flexDirection: "column", gap: "4" })}>
              <Alert>
                <Upload className={css({ height: "4", width: "4" })} />
                <AlertDescription>
                  File: <strong>{file.name}</strong> ({preview.length} rows)
                </AlertDescription>
              </Alert>

              {preview.length > 0 && (
                <div className={css({ display: "flex", alignItems: "center", gap: "4" })}>
                  <Badge variant="default" className={css({ gap: "1" })}>
                    <CheckCircle2 className={css({ height: "3", width: "3" })} />
                    {validCount} Valid
                  </Badge>
                  {errorCount > 0 && (
                    <Badge variant="destructive" className={css({ gap: "1" })}>
                      <XCircle className={css({ height: "3", width: "3" })} />
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
            <div
              className={css({
                borderRadius: "md",
                border: "1px solid",
                borderColor: "border.subtle",
                maxHeight: "[500px]",
                overflowY: "auto",
              })}
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className={css({ width: "12" })}>Row</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.slice(0, 50).map((v) => (
                    <TableRow key={v.row}>
                      <TableCell>{v.row}</TableCell>
                      <TableCell className={css({ fontWeight: "medium" })}>
                        {v.data.name}
                      </TableCell>
                      <TableCell>{v.data.category}</TableCell>
                      <TableCell>
                        ₹{parseFloat(v.data.price).toLocaleString()}
                      </TableCell>
                      <TableCell>{v.data.quantity?.trim() || "—"}</TableCell>
                      <TableCell>
                        {v.errors.length > 0 ? (
                          <div className={css({ display: "flex", flexDirection: "column", gap: "1" })}>
                            <Badge variant="destructive">Errors</Badge>
                            {v.errors.map((err, i) => (
                              <p key={i} className={css({ fontSize: "xs", color: "danger" })}>
                                {err}
                              </p>
                            ))}
                          </div>
                        ) : (
                          <div className={css({ display: "flex", flexDirection: "column", gap: "1" })}>
                            <Badge variant="default">Valid</Badge>
                            {v.warnings.map((warn, i) => (
                              <p key={i} className={css({ fontSize: "xs", color: "gold.700" })}>
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
              <p className={css({ fontSize: "sm", color: "fg.muted", marginTop: "2" })}>
                Showing first 50 rows of {preview.length}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      {preview.length > 0 && (
        <div
          className={css({
            display: "flex",
            flexDirection: "column-reverse",
            gap: "3",
            sm: { flexDirection: "row", justifyContent: "flex-end" },
          })}
        >
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
            {uploading && <Loader2 className={css({ height: "4", width: "4", animation: "spin" })} />}
            Import {validCount} Products
          </Button>
        </div>
      )}
    </div>
  );
}
