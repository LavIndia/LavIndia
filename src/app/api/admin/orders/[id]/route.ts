import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { revalidateTag } from "next/cache";
import { BESTSELLERS_TAG } from "@/lib/bestseller-ranking";
import { revalidatePromotions } from "@/lib/promotions-cache";
import { changeOrderStatus, recordRefund, refundInputSchema } from "@/modules/orders";
import { refundMethodLabel } from "@/modules/orders/order-labels";
import { formatPaisa } from "@/modules/_shared/money";
import { isDomainError, toErrorResponse } from "@/modules/_shared/errors";
import { revalidateStockViews } from "@/lib/catalog-cache";

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
  // The refund staff sent back by hand, recorded with the change. Only a
  // cancelled or refunded order can carry one.
  refund: refundInputSchema.optional(),
}).refine(
  (body) => !body.refund || body.status === "CANCELLED" || body.status === "REFUNDED",
  { message: "A refund can be recorded only when the order is cancelled or refunded", path: ["refund"] },
);

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
    const { status, refund } = orderUpdateSchema.parse(body);

    // Stock, offer uses, payment status, the cash-on-delivery invoice and a
    // credit note all follow the status, once only — see
    // src/modules/orders/order-status.ts. A refund recorded with it commits
    // or fails together with the change.
    const { order, stockMoved } = await prisma.$transaction(
      async (tx) => {
        const changed = await changeOrderStatus(tx, id, status, session.user.id);
        if (refund) await recordRefund(tx, id, refund);
        return changed;
      },
      { timeout: 20_000 },
    );
    revalidatePromotions();

    // Create order tracking entry
    await prisma.orderTracking.create({
      data: {
        orderId: order.id,
        status,
        description: refund
          ? `Refund of ${formatPaisa(refund.amountCents)} recorded (${refundMethodLabel(refund.method)})`
          : `Order status updated to ${status}`,
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
          ...(refund ? { refund } : {}),
        },
      },
    });

    // Cancelling an order removes its units from the bestseller ranking, so
    // the cached aggregate is dropped whenever a status changes.
    revalidateTag(BESTSELLERS_TAG);
    // Pieces went back on the shelf (or were taken again), so listings and
    // product pages showing their availability are refreshed.
    if (stockMoved) revalidateStockViews();

    return NextResponse.json(order);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }
    // Reinstating an order whose pieces have since sold, for example.
    if (isDomainError(error)) {
      const { body, status } = toErrorResponse(error);
      return NextResponse.json(body, { status });
    }

    console.error("Error updating order:", error);
    return NextResponse.json(
      { error: "Failed to update order" },
      { status: 500 }
    );
  }
}
