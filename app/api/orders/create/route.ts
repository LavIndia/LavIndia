import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const orderSchema = z.object({
  addressId: z.string(),
  paymentMethod: z.enum(["cod", "razorpay"]),
  shippingMethod: z.enum(["standard", "express"]),
  items: z
    .array(
      z.object({
        productId: z.string(),
        variantId: z.string().optional(),
        quantity: z.number().int().positive(),
        priceCents: z.number().int().positive(),
        name: z.string(),
        image: z.string().optional(),
      })
    )
    .min(1),
  totalCents: z.number().int().positive(),
  shippingCents: z.number().int().min(0),
  taxCents: z.number().int().min(0),
  notes: z.string().optional(),
});

// Generate unique order number
function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `LVI-${timestamp}-${random}`;
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validated = orderSchema.parse(body);

    // Verify address belongs to user
    const address = await prisma.address.findFirst({
      where: {
        id: validated.addressId,
        userId: session.user.id,
      },
    });

    if (!address) {
      return NextResponse.json({ error: "Invalid address" }, { status: 400 });
    }

    // Generate order number
    const orderNumber = generateOrderNumber();

    // Calculate totals
    const grandTotalCents =
      validated.totalCents + validated.shippingCents + validated.taxCents;

    // Determine shipping fee based on shipping method
    const shippingCents = validated.shippingMethod === "express" ? 19900 : 9900;

    // Create order with payment and tracking in transaction
    const order = await prisma.$transaction(async (tx) => {
      // Create order
      const newOrder = await tx.order.create({
        data: {
          userId: session.user.id,
          addressId: validated.addressId,
          orderNumber,
          totalCents: validated.totalCents,
          shippingCents,
          taxCents: validated.taxCents,
          paymentMethod: validated.paymentMethod,
          paymentProvider:
            validated.paymentMethod === "razorpay" ? "razorpay" : null,
          paymentStatus:
            validated.paymentMethod === "cod" ? "PENDING" : "PENDING",
          status: validated.paymentMethod === "cod" ? "PROCESSING" : "PENDING",
          notes: validated.notes,
        },
      });

      // Create order items
      await tx.orderItem.createMany({
        data: validated.items.map((item) => ({
          orderId: newOrder.id,
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
          priceCents: item.priceCents,
          name: item.name,
          image: item.image,
        })),
      });

      // Create payment record
      await tx.payment.create({
        data: {
          orderId: newOrder.id,
          amountCents: grandTotalCents,
          currency: "INR",
          method: validated.paymentMethod,
          status: validated.paymentMethod === "cod" ? "COMPLETED" : "PENDING",
        },
      });

      // Create initial tracking entry
      await tx.orderTracking.create({
        data: {
          orderId: newOrder.id,
          status: "Order placed",
          description:
            validated.paymentMethod === "cod"
              ? "Order placed with Cash on Delivery"
              : "Order placed, awaiting payment confirmation",
          updatedBy: session.user.id,
        },
      });

      if (validated.paymentMethod === "cod") {
        // For COD, add another tracking entry
        await tx.orderTracking.create({
          data: {
            orderId: newOrder.id,
            status: "Processing",
            description: "Order is being prepared for shipment",
            updatedBy: "system",
          },
        });
      }

      return newOrder;
    });

    // Fetch complete order details
    const orderWithDetails = await prisma.order.findUnique({
      where: { id: order.id },
      include: {
        items: true,
        address: true,
        payment: true,
        tracking: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    return NextResponse.json({
      success: true,
      order: orderWithDetails,
      message:
        validated.paymentMethod === "cod"
          ? "Order placed successfully"
          : "Order created, please complete payment",
    });
  } catch (error) {
    console.error("Order creation error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid order data", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 }
    );
  }
}

// GET endpoint to fetch user's orders
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orders = await prisma.order.findMany({
      where: { userId: session.user.id },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
        address: true,
        payment: true,
        tracking: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ orders });
  } catch (error) {
    console.error("Failed to fetch orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}
