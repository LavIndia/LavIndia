import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET - Fetch all user orders
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: session.user.email || undefined },
          { id: session.user.id || undefined },
        ],
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const orders = await prisma.order.findMany({
      where: { userId: user.id },
      include: {
        items: true,
        address: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Which orders have a GST tax invoice (only those priced by the GST engine).
    // Best effort: the order list must never fail because of it.
    const withGst = new Set<string>();
    try {
      const rows = await prisma.gstInvoiceDetail.findMany({
        where: { orderId: { in: orders.map((o) => o.id) } },
        select: { orderId: true },
      });
      rows.forEach((r) => withGst.add(r.orderId));
    } catch {}

    return NextResponse.json({ orders: orders.map((o) => ({ ...o, gstInvoice: withGst.has(o.id) })) });
  } catch (error) {
    console.error("Fetch orders error:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}
