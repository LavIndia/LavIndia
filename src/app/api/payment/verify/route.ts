import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { settleGatewayPayment } from "@/modules/ecommerce";
import { revalidateStockViews } from "@/lib/catalog-cache";
import { isValidCheckoutSignature } from "@/modules/payments/razorpay/config";
import { fetchPaymentInstrument } from "@/modules/payments/razorpay/payment-details";

const bodySchema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
  orderId: z.string().min(1), // Our DB order ID
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = parsed.data;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { userId: true, payment: { select: { razorpayOrderId: true } } },
    });
    // Someone else's order answers exactly like a missing one.
    if (!order || order.userId !== session.user.id) {
      return NextResponse.json({ error: "That order could not be found" }, { status: 404 });
    }

    // The payment must be the one opened FOR this order. A valid signature
    // from a cheap order's payment must not be usable to settle a dear one.
    if (!order.payment?.razorpayOrderId || order.payment.razorpayOrderId !== razorpay_order_id) {
      return NextResponse.json({ error: "Payment verification failed", verified: false }, { status: 400 });
    }

    if (!isValidCheckoutSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
      // Recorded for the admin, but the order is left open: a mismatch from
      // the browser says nothing about whether money moved, and the gateway's
      // own confirmation (the webhook) may still settle it. An unpaid hold
      // lapses by itself.
      await prisma.payment.update({
        where: { orderId },
        data: { errorCode: "SIGNATURE_MISMATCH", errorDescription: "Payment signature verification failed" },
      });
      return NextResponse.json({ error: "Payment verification failed", verified: false }, { status: 400 });
    }

    // Which instrument carried the payment is asked for OUTSIDE the
    // transaction — a third-party call, never held across a lock. It never
    // throws; a slow gateway only leaves these fields empty.
    const instrument = await fetchPaymentInstrument(razorpay_payment_id);

    // Recording the payment, taking the stock and issuing the invoice happen
    // together. An order cancelled before the money landed is not revived:
    // the payment is recorded and a refund is owed instead.
    const outcome = await settleGatewayPayment({
      orderId,
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
      instrument,
    });

    revalidateStockViews();

    if (outcome === "CLOSED") {
      return NextResponse.json({
        success: true,
        verified: true,
        orderCancelled: true,
        message:
          "Your payment was received, but this order had already been cancelled. A full refund will follow.",
      });
    }

    return NextResponse.json({ success: true, verified: true, message: "Payment verified successfully" });
  } catch (error) {
    console.error("Payment verification error:", error);
    return NextResponse.json({ error: "Payment verification failed" }, { status: 500 });
  }
}
