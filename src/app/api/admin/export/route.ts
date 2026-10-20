import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { unparse } from "papaparse";
import { exportCustomersCsv } from "./customers-csv";
import { getTopProducts } from "@/modules/analytics/top-products";
import { exportOrdersCsv, orderFiltersFrom } from "./orders-csv";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");

    let csvData: string;
    let filename: string;

    switch (type) {
      case "products":
        csvData = await exportProducts();
        filename = `products-${Date.now()}.csv`;
        break;

      case "orders":
        // Exactly the orders the screen shows: the same filters, the same query.
        csvData = await exportOrdersCsv(orderFiltersFrom(searchParams));
        filename = `orders-${Date.now()}.csv`;
        break;

      case "customers":
        csvData = await exportCustomersCsv(searchParams);
        filename = `customers-${Date.now()}.csv`;
        break;

      case "analytics":
        csvData = await exportAnalytics();
        filename = `analytics-${Date.now()}.csv`;
        break;

      default:
        return NextResponse.json(
          { error: "Invalid export type" },
          { status: 400 }
        );
    }

    return new NextResponse(csvData, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}

async function exportProducts() {
  const products = await prisma.product.findMany({
    include: {
      category: true,
      images: {
        orderBy: { position: "asc" },
      },
      variants: {
        where: { isActive: true },
        orderBy: { position: "asc" },
        include: { inventoryLevels: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  // Keep these keys in lockstep with the downloadable bulk-import template.
  // Papa Parse quotes cells containing commas, so multi-value options and
  // image paths remain a single cell when the CSV is opened or re-imported.
  const data = products.map((p) => {
    const variants = p.variants.filter((variant) => !variant.isDefault);
    const colors = [...new Set(variants.map((variant) => variant.color).filter((value): value is string => Boolean(value)))];
    const sizes = [...new Set(variants.map((variant) => variant.size).filter((value): value is string => Boolean(value)))];

    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description ?? "",
      price: (p.priceCents / 100).toFixed(2),
      compareAtPrice: p.compareAtCents != null ? (p.compareAtCents / 100).toFixed(2) : "",
      costPrice: p.costCents != null ? (p.costCents / 100).toFixed(2) : "",
      openingStock: p.variants.reduce(
        (total, variant) => total + variant.inventoryLevels.reduce((sum, level) => sum + level.quantity, 0),
        0,
      ),
      category: p.category.name,
      sku: p.sku ?? "",
      material: p.material ?? "",
      tags: p.tags.join("|"),
      colors: colors.join(", "),
      sizes: sizes.join(", "),
      imagePaths: p.images.map((image) => image.url).join(", "),
      isPublished: String(p.isPublished),
      isFeatured: String(p.isFeatured),
      isLimitedEdition: String(p.isLimitedEdition),
    };
  });

  return unparse(data);
}

/**
 * Sales by product, all time — the Analytics screen's best sellers, uncapped.
 *
 * The same orders and the same money as the screen and the Dashboard: sales
 * only (never cancelled, refunded or unpaid orders), and each line at what
 * the client actually paid for it, discounts off and GST counted once —
 * never the list price. Delivery and cash-on-delivery charges belong to no
 * product, so the column adds up to the Dashboard's sales less those.
 */
async function exportAnalytics() {
  const products = await getTopProducts(null);

  const data = products.map((product) => ({
    ProductID: product.productId ?? "",
    ProductName: product.name,
    UnitsSold: product.quantitySold,
    "Amount paid (₹)": (product.revenueCents / 100).toFixed(2),
  }));

  return data.length > 0
    ? unparse(data)
    : unparse({ fields: ["ProductID", "ProductName", "UnitsSold", "Amount paid (₹)"], data: [] });
}
