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
        where: { isPrimary: true },
        take: 1,
      },
    },
  });

  const data = products.map((p) => ({
    ID: p.id,
    Name: p.name,
    SKU: p.sku || "",
    Category: p.category.name,
    Price: (p.priceCents / 100).toFixed(2),
    CompareAt: p.compareAtCents ? (p.compareAtCents / 100).toFixed(2) : "",
    Stock: p.stock,
    Published: p.isPublished ? "Yes" : "No",
    Featured: p.isFeatured ? "Yes" : "No",
    CreatedAt: p.createdAt.toISOString(),
  }));

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
