import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { revalidateStockViews } from "@/lib/catalog-cache";
import { checkoutService } from "@/modules/ecommerce";
import { appliedSnapshot, persistOrderLines } from "@/modules/orders";
import { OrderId } from "@/modules/_shared/ids";
import { isDomainError, toErrorResponse } from "@/modules/_shared/errors";
import { BESTSELLERS_TAG } from "@/lib/bestseller-ranking";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cartItemSchema, resolveCartLines } from "@/lib/cart-lines";
import { priceCart } from "@/lib/cart-quote";
import { DELIVERY_RATES_SELECT, onlinePaymentInstrument, shippingCentsFor } from "@/lib/online-charges";
import { z } from "zod";

// The client sends WHAT it wants, never what it costs. Every price, offer,
// tax and fee is worked out here, the same way the cart and checkout showed
// it (src/lib/cart-quote.ts). Older clients still send price fields; they
// are accepted and ignored.
const orderSchema = z.object({
  addressId: z.string(),
  paymentMethod: z.enum(["cod", "razorpay"]),
  /** The instrument chosen on the checkout page, for offers that ask. */
  paymentChoice: z.enum(["upi", "card", "cod"]).optional(),
  shippingMethod: z.enum(["standard", "express"]),
  items: z.array(cartItemSchema).min(1),
  discountCode: z.string().trim().max(40).optional(),
  /** The total the checkout showed. The order never charges more than this. */
  expectedPayableCents: z.number().int().min(0).optional(),
  notes: z.string().optional(),
});

// Generate unique order number
function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `LVI-${timestamp}-${random}`;
}

function stockProblem(problem: { available: number; productName: string }) {
  return problem.available === 0
    ? `${problem.productName} has just sold out`
    : `Only ${problem.available} left of ${problem.productName}`;
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const validated = orderSchema.parse(await req.json());

    const [address, settings, lines] = await Promise.all([
      prisma.address.findFirst({ where: { id: validated.addressId, userId: session.user.id } }),
      // The cash-on-delivery fee is read from settings, never taken from the
      // request — the same rule every price and charge follows.
      prisma.siteSettings.findFirst({ select: DELIVERY_RATES_SELECT }),
      resolveCartLines(validated.items),
    ]);

    if (!address) {
      return NextResponse.json({ error: "Invalid address" }, { status: 400 });
    }

    const codFeeCents = validated.paymentMethod === "cod" ? (settings?.codFeeCents ?? 0) : 0;
    const code = validated.discountCode?.trim().toUpperCase() || null;

    const priced = await priceCart({
      channel: "ONLINE",
      lines,
      codes: code ? [code] : [],
      customerId: session.user.id,
      paymentMethod: onlinePaymentInstrument(
        validated.paymentChoice ?? (validated.paymentMethod === "cod" ? "cod" : undefined),
      ),
      shippingCents: shippingCentsFor(validated.shippingMethod, settings),
    });
    const { quote } = priced;

    // Draft is a statement about the website: an unpublished piece cannot be
    // bought online by anyone who happens to have its id.
    const unlisted = [...priced.variants.values()].filter((v) => !v.isPublished || !v.isActive);
    if (unlisted.length > 0) {
      return NextResponse.json(
        { error: `"${unlisted[0].productName}" is not available to buy online` },
        { status: 400 },
      );
    }

    // A code that does nothing is an error at this point, not a silent no-op:
    // the checkout showed it applied, or the client would not be here.
    const codeProblem = priced.codeProblems[0];
    if (codeProblem) {
      return NextResponse.json(
        { error: codeProblem.text, code: "CODE_NOT_APPLIED" },
        { status: 400 },
      );
    }

    // Stock is checked and HELD server-side. This is what decides whether the
    // sale may proceed, and it is what stops two people buying the same last
    // piece.
    const stockLines = lines.map((line) => ({ variantId: line.variantId, quantity: line.quantity }));
    const check = await checkoutService.validate(stockLines);
    if (!check.ok) {
      return NextResponse.json(
        { error: stockProblem(check.problems[0]), code: "INSUFFICIENT_STOCK", problems: check.problems },
        { status: 409 },
      );
    }

    const grandTotalCents = quote.totals.grandTotalCents + codFeeCents;

    // An offer can end or run out between the checkout showing a total and
    // the client pressing Place order. They are never charged more than they
    // were shown: the order stops and the checkout re-prices. A lower total
    // (a new offer started) simply goes through in their favour.
    if (
      validated.expectedPayableCents !== undefined &&
      grandTotalCents > validated.expectedPayableCents
    ) {
      return NextResponse.json(
        {
          error: "Your total has changed since you opened checkout. Please review it and place the order again.",
          code: "PRICE_CHANGED",
          payableCents: grandTotalCents,
        },
        { status: 409 },
      );
    }

    const images = new Map(lines.map((line) => [line.variantId, line.image]));

    const order = await prisma.$transaction(
      async (tx) => {
        const newOrder = await tx.order.create({
          data: {
            userId: session.user.id,
            addressId: validated.addressId,
            orderNumber: generateOrderNumber(),
            totalCents: quote.totals.subtotalCents,
            shippingCents: quote.totals.shippingCents,
            codFeeCents,
            taxCents: quote.totals.taxCents,
            taxIncluded: quote.totals.taxIncluded,
            discountCode: quote.applied.find((a) => a.code)?.code ?? null,
            discountCents: quote.totals.discountCents,
            appliedPromotions: appliedSnapshot(quote),
            paymentMethod: validated.paymentMethod,
            paymentProvider: validated.paymentMethod === "razorpay" ? "razorpay" : null,
            paymentStatus: "PENDING",
            status: validated.paymentMethod === "cod" ? "PROCESSING" : "PENDING",
            notes: validated.notes,
            customerName: address.fullName,
            customerMobile: address.mobile,
          },
        });

        // Lines, the offers behind each line's discount, and each offer's
        // use — counted atomically, so a limited offer cannot be overspent.
        await persistOrderLines(tx, newOrder.id, quote, {
          promotions: priced.pricing.promotions,
          images,
          // Cash on delivery is a real order now; a gateway payment only
          // counts once it is paid (api/payment/verify).
          countUsesNow: validated.paymentMethod === "cod",
        });

        await tx.payment.create({
          data: {
            orderId: newOrder.id,
            amountCents: grandTotalCents,
            currency: "INR",
            method: validated.paymentMethod,
            status: validated.paymentMethod === "cod" ? "COMPLETED" : "PENDING",
          },
        });

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
        await checkoutService.reserveForOrder(OrderId(newOrder.id), stockLines, tx);
        if (validated.paymentMethod === "cod") {
          await checkoutService.commitPaidOrder(OrderId(newOrder.id), stockLines, tx);
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
      },
      { timeout: 20_000 },
    );

    // A new order changes the bestseller ranking, and it took stock with it,
    // so the listings and product pages are dropped too.
    revalidateTag(BESTSELLERS_TAG);
    revalidateStockViews();

    const orderWithDetails = await prisma.order.findUnique({
      where: { id: order.id },
      include: {
        items: true,
        address: true,
        payment: true,
        tracking: { orderBy: { createdAt: "asc" } },
      },
    });

    return NextResponse.json({
      success: true,
      order: orderWithDetails,
      payableCents: grandTotalCents,
      message:
        validated.paymentMethod === "cod"
          ? "Order placed successfully"
          : "Order created, please complete payment",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid order data", details: error.errors },
        { status: 400 },
      );
    }
    if (isDomainError(error)) {
      const { body, status } = toErrorResponse(error);
      return NextResponse.json(body, { status });
    }
    console.error("Order creation error:", error);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
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
