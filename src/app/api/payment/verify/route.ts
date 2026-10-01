import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { checkoutService, settleGatewayPayment } from "@/modules/ecommerce";
import { revalidateStockViews } from "@/lib/catalog-cache";
import { OrderId } from "@/modules/_shared/ids";
import { prisma as db } from "@/lib/prisma";
import { fetchPaymentInstrument } from "@/modules/payments/razorpay/payment-details";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      orderId, // Our DB order ID
    } = body;

    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature ||
      !orderId
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Verify signature
    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      // Signature verification failed
      await prisma.payment.update({
        where: { orderId },
        data: {
          status: "FAILED",
          errorCode: "SIGNATURE_MISMATCH",
          errorDescription: "Payment signature verification failed",
        },
      });

      // The hold must go back on the shelf. Leaving it would make the piece
      // unsellable until the reservation expired, for a payment that never
      // happened.
      const failedItems = await db.orderItem.findMany({
        where: { orderId, variantId: { not: null } },
        select: { variantId: true, quantity: true },
      });
      await checkoutService.releaseForOrder(
        OrderId(orderId),
        failedItems.map((item) => ({ variantId: item.variantId!, quantity: item.quantity })),
      );

      return NextResponse.json(
        { error: "Payment verification failed", verified: false },
        { status: 400 }
      );
    }

    // Signature verified. Which instrument actually carried the payment is
    // asked for OUTSIDE the transaction — it is a call to a third party, and
    // holding a database transaction open across the public internet is how
    // a busy evening turns into a pile of lock timeouts. It never throws, so
    // a slow or unavailable gateway leaves these fields null and the sale
    // still completes.
    const instrument = await fetchPaymentInstrument(razorpay_payment_id);

    // Settling the hold, recording the payment and issuing the invoice happen
    // together — a paid order must never exist without its stock consumed
    // and its bill raised. An order cancelled before the money landed is not
    // revived: the payment is recorded and a refund is owed instead.
    const outcome = await settleGatewayPayment({
      orderId,
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
      instrument,
    });

    // Stock left the shelf with this payment (or a lapsed hold was let go);
    // listings showing it as available must refresh.
    revalidateStockViews();

    if (outcome === "CLOSED") {
      // Not an error: the payment went through and is on record. The client
      // is told plainly that the order had been cancelled and the money will
      // come back to them.
      return NextResponse.json({
        success: true,
        verified: true,
        orderCancelled: true,
        message:
          "Your payment was received, but this order had already been cancelled. A full refund will follow.",
      });
    }

    return NextResponse.json({
      success: true,
      verified: true,
      message: "Payment verified successfully",
    });
  } catch (error) {
    console.error("Payment verification error:", error);
    return NextResponse.json(
      { error: "Payment verification failed" },
      { status: 500 }
    );
  }
}
