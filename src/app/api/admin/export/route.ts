import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { unparse } from "papaparse";

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
        csvData = await exportOrders();
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

async function exportOrders() {
  const orders = await prisma.order.findMany({
    include: {
      user: true,
      items: {
        include: {
          product: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const data = orders.map((o) => ({
    OrderNumber: o.orderNumber,
    CustomerName: o.user.name || "",
    CustomerEmail: o.user.email || "",
    Total: (o.totalCents / 100).toFixed(2),
    Status: o.status,
    PaymentStatus: o.paymentStatus,
    PaymentMethod: o.paymentMethod || "",
    ItemCount: o.items.length,
    CreatedAt: o.createdAt.toISOString(),
  }));

  return unparse(data);
}

async function exportCustomers() {
  const customers = await prisma.user.findMany({
    where: { role: "CUSTOMER" },
    include: {
      orders: true,
      _count: {
        select: { orders: true },
      },
    },
  });

  const data = customers.map((c) => {
    const totalSpent = c.orders.reduce((sum, o) => sum + o.totalCents, 0);
    return {
      Name: c.name || "",
      Email: c.email || "",
      Mobile: c.mobile || "",
      OrderCount: c._count.orders,
      TotalSpent: (totalSpent / 100).toFixed(2),
      JoinedAt: c.createdAt.toISOString(),
    };
  });

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
      if (!productSales[item.productId]) {
        productSales[item.productId] = {
          name: item.name,
          quantity: 0,
          revenue: 0,
        };
      }
      productSales[item.productId].quantity += item.quantity;
      productSales[item.productId].revenue += item.priceCents * item.quantity;
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
