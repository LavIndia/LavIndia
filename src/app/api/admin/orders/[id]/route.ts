import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { revalidateTag } from "next/cache";
import { BESTSELLERS_TAG } from "@/lib/bestseller-ranking";

const orderUpdateSchema = z.object({
  status: z.enum([
    "PENDING",
    "PROCESSING",
    "SHIPPED",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
    "CANCELLED",
    "REFUNDED",
  ]),
});

// PATCH /api/admin/orders/[id] - Update order status
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { status } = orderUpdateSchema.parse(body);

    const order = await prisma.order.update({
      where: { id },
      data: { status },
      include: {
        user: true,
        items: true,
      },
    });

    // Create order tracking entry
    await prisma.orderTracking.create({
      data: {
        orderId: order.id,
        status,
        description: `Order status updated to ${status}`,
        updatedBy: session.user.id,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        adminId: session.user.id!,
        adminName: session.user.name || undefined,
        action: "UPDATE",
        entity: "Order",
        entityId: order.id,
        metadata: {
          orderNumber: order.orderNumber,
          newStatus: status,
        },
      },
    });

    // Cancelling an order removes its units from the bestseller ranking, so
    // the cached aggregate is dropped whenever a status changes.
    revalidateTag(BESTSELLERS_TAG);

    return NextResponse.json(order);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error updating order:", error);
    return NextResponse.json(
      { error: "Failed to update order" },
      { status: 500 }
    );
  }
}
