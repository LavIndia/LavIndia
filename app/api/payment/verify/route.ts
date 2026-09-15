import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

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

      return NextResponse.json(
        { error: "Payment verification failed", verified: false },
        { status: 400 }
      );
    }

    // Signature verified - update payment and order status
    await prisma.$transaction([
      prisma.payment.update({
        where: { orderId },
        data: {
          razorpayOrderId: razorpay_order_id,
          razorpayPaymentId: razorpay_payment_id,
          razorpaySignature: razorpay_signature,
          status: "COMPLETED",
        },
      }),
      prisma.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: "COMPLETED",
          paymentId: razorpay_payment_id,
          status: "PROCESSING",
        },
      }),
      // Add tracking entry
      prisma.orderTracking.create({
        data: {
          orderId,
          status: "Payment confirmed",
          description: "Payment successfully received via Razorpay",
          updatedBy: "system",
        },
      }),
    ]);

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
