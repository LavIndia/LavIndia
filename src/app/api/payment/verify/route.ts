import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { checkoutService } from "@/modules/ecommerce";
import { billingService } from "@/modules/billing";
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

    // Signature verified. Settling the hold, recording the payment and
    // issuing the invoice happen together — a paid order must never exist
    // without its stock consumed and its bill raised.
    const paidItems = await db.orderItem.findMany({
      where: { orderId, variantId: { not: null } },
      select: { variantId: true, quantity: true },
    });

    // Which instrument actually carried the payment. Asked for OUTSIDE the
    // transaction — it is a call to a third party, and holding a database
    // transaction open across the public internet is how a busy evening turns
    // into a pile of lock timeouts. It never throws, so a slow or unavailable
    // Razorpay leaves these fields null and the sale still completes.
    const instrument = await fetchPaymentInstrument(razorpay_payment_id);

    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { orderId },
        data: {
          razorpayOrderId: razorpay_order_id,
          razorpayPaymentId: razorpay_payment_id,
          razorpaySignature: razorpay_signature,
          status: "COMPLETED",
          // Recorded only when known, so a failed lookup never overwrites a
          // detail that some other path (a webhook, say) already captured.
          ...(instrument.method ? { method: instrument.method } : {}),
          ...(instrument.instrumentDetail
            ? { instrumentDetail: instrument.instrumentDetail }
            : {}),
          ...(instrument.payerVpa ? { payerVpa: instrument.payerVpa } : {}),
          ...(instrument.utr ? { utr: instrument.utr } : {}),
        },
      });
      await tx.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: "COMPLETED",
          paymentId: razorpay_payment_id,
          status: "PROCESSING",
        },
      });
      await tx.orderTracking.create({
        data: {
          orderId,
          status: "Payment confirmed",
          description: instrument.instrumentDetail
            ? `Payment received via ${instrument.instrumentDetail}`
            : "Payment successfully received via Razorpay",
          updatedBy: "system",
        },
      });

      // Converts the units already set aside rather than taking fresh stock,
      // so the reservation is not double-counted.
      if (paidItems.length > 0) {
        await checkoutService.commitPaidOrder(
          OrderId(orderId),
          paidItems.map((item) => ({ variantId: item.variantId!, quantity: item.quantity })),
          tx,
        );
      }

      await billingService.issueInvoiceForOrder(OrderId(orderId), undefined, tx);
    }, { timeout: 20_000 });

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
