import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { checkoutService } from "@/modules/ecommerce";
import { OrderId } from "@/modules/_shared/ids";
import { BESTSELLERS_TAG } from "@/lib/bestseller-ranking";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import {
  checkDiscountEligibility,
  computeDiscountCents,
  findDiscountByCode,
} from "@/lib/discounts";

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
  // The client sends the code only — the discount amount is always
  // recomputed server-side (never trust a client-provided amount).
  discountCode: z.string().optional(),
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

    // Determine shipping fee based on shipping method
    const shippingCents = validated.shippingMethod === "express" ? 19900 : 9900;

    // The cash-on-delivery fee is read from settings here, never taken from
    // the request — the same rule the shipping charge and the discount
    // follow. A client that asked to be charged nothing would otherwise be
    // obliged.
    const settings = await prisma.siteSettings.findFirst({
      select: { codFeeCents: true },
    });
    const codFeeCents =
      validated.paymentMethod === "cod" ? (settings?.codFeeCents ?? 0) : 0;

    // Pre-check the coupon outside the transaction so a bad/expired code
    // fails fast with a clear message before any writes happen.
    if (validated.discountCode) {
      const preCheckDiscount = await findDiscountByCode(validated.discountCode);
      if (!preCheckDiscount) {
        return NextResponse.json({ error: "Invalid coupon code" }, { status: 400 });
      }
      const eligibilityError = checkDiscountEligibility(
        preCheckDiscount,
        validated.totalCents,
      );
      if (eligibilityError) {
        return NextResponse.json({ error: eligibilityError }, { status: 400 });
      }
    }

    // Stock is checked and HELD server-side. The client's prices and
    // quantities are advisory; this is what actually decides whether the
    // sale may proceed, and it is what stops two people buying the same
    // last piece.
    const stockLines = validated.items
      .filter((item) => item.variantId)
      .map((item) => ({ variantId: item.variantId!, quantity: item.quantity }));

    if (stockLines.length > 0) {
      const check = await checkoutService.validate(stockLines);
      if (!check.ok) {
        const first = check.problems[0];
        return NextResponse.json(
          {
            error:
              first.available === 0
                ? `${first.productName} has just sold out`
                : `Only ${first.available} left of ${first.productName}`,
            code: "INSUFFICIENT_STOCK",
            problems: check.problems,
          },
          { status: 409 },
        );
      }
    }

    // Create order with payment and tracking in transaction
    const order = await prisma.$transaction(async (tx) => {
      let discountCents = 0;
      let discountCode: string | null = null;

      if (validated.discountCode) {
        // Re-fetch and re-validate inside the transaction (not the
        // pre-check instance) so the usage-limit check and the increment
        // below are atomic against concurrent redemptions of the same code.
        const discount = await tx.discount.findFirst({
          where: { code: { equals: validated.discountCode.trim(), mode: "insensitive" } },
        });
        if (!discount) throw new Error("DISCOUNT_INVALID");
        const eligibilityError = checkDiscountEligibility(discount, validated.totalCents);
        if (eligibilityError) throw new Error("DISCOUNT_INELIGIBLE");

        discountCents = computeDiscountCents(discount, validated.totalCents);
        discountCode = discount.code;

        await tx.discount.update({
          where: { id: discount.id },
          data: { usedCount: { increment: 1 } },
        });
      }

      const grandTotalCents =
        validated.totalCents +
        shippingCents +
        codFeeCents +
        validated.taxCents -
        discountCents;

      // Create order
      const newOrder = await tx.order.create({
        data: {
          userId: session.user.id,
          addressId: validated.addressId,
          orderNumber,
          totalCents: validated.totalCents,
          shippingCents,
          codFeeCents,
          taxCents: validated.taxCents,
          discountCode,
          discountCents,
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

      // Held inside the same transaction as the order, so an order never
      // exists without its stock set aside. COD is settled immediately —
      // there is no gateway step to wait for — while a gateway payment keeps
      // the hold until it is confirmed.
      if (stockLines.length > 0) {
        await checkoutService.reserveForOrder(OrderId(newOrder.id), stockLines, tx);
        if (validated.paymentMethod === "cod") {
          await checkoutService.commitPaidOrder(OrderId(newOrder.id), stockLines, tx);
        }
      }

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

    // A new order changes the bestseller ranking, so its cache is dropped
    // here rather than waiting for the revalidate window to lapse.
    revalidateTag(BESTSELLERS_TAG);
    revalidateTag("homepage");

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
    if (error instanceof Error && error.message === "DISCOUNT_INVALID") {
      return NextResponse.json({ error: "Invalid coupon code" }, { status: 400 });
    }
    if (error instanceof Error && error.message === "DISCOUNT_INELIGIBLE") {
      return NextResponse.json(
        { error: "This coupon is no longer valid for this order" },
        { status: 400 },
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
