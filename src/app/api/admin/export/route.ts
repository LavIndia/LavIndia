import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { unparse } from "papaparse";
import { listCustomers } from "@/modules/customers/customer-list";
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
        csvData = await exportCustomers();
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

async function exportCustomers() {
  // The same figures as the Customers screen: both channels, and spend as
  // what was actually paid on orders that are sales.
  const customers = await listCustomers();

  const data = customers.map((c) => ({
    Name: c.name || "",
    Email: c.email || "",
    Mobile: c.mobile || "",
    OrderCount: c.orderCount,
    TotalSpent: (c.totalSpent / 100).toFixed(2),
    JoinedAt: c.createdAt.toISOString(),
  }));

  return unparse(data);
}

async function exportAnalytics() {
  const orders = await prisma.order.findMany({
    where: {
      paymentStatus: "COMPLETED",
    },
    include: {
      items: {
        include: {
          product: true,
        },
      },
    },
  });

  // Group by product
  const productSales: Record<
    string,
    { name: string; quantity: number; revenue: number }
  > = {};

  orders.forEach((order) => {
    order.items.forEach((item) => {
      // Lines of a deleted product have no id any more; group them by the
      // name they were sold under instead.
      const key = item.productId ?? `deleted:${item.name}`;
      if (!productSales[key]) {
        productSales[key] = {
          name: item.name,
          quantity: 0,
          revenue: 0,
        };
      }
      productSales[key].quantity += item.quantity;
      productSales[key].revenue += item.priceCents * item.quantity;
    });
  });

  const data = Object.entries(productSales).map(([id, stats]) => ({
    ProductID: id,
    ProductName: stats.name,
    UnitsSold: stats.quantity,
    Revenue: (stats.revenue / 100).toFixed(2),
  }));

  return unparse(data);
}
