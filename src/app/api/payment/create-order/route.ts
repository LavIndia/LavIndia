import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { isDomainError, toErrorResponse } from "@/modules/_shared/errors";
import { createCheckoutOrder } from "@/modules/payments/razorpay/checkout-order";
import { readGatewayFailure } from "@/modules/payments/razorpay/gateway-error";

// The browser names the order and nothing else. What the order costs is the
// server's to say — an amount sent from here would be an amount to forge.
const bodySchema = z.object({ orderId: z.string().min(1) });

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "An order is required" }, { status: 400 });
  }

  try {
    const order = await createCheckoutOrder(parsed.data.orderId, session.user.id);
    return NextResponse.json({
      success: true,
      orderId: order.razorpayOrderId,
      amount: order.amountCents,
      currency: order.currency,
      keyId: order.keyId,
    });
  } catch (error) {
    if (isDomainError(error)) {
      const { body, status } = toErrorResponse(error);
      return NextResponse.json(body, { status });
    }
    const failure = readGatewayFailure(error);
    console.error("Razorpay order creation failed:", failure.message);
    return NextResponse.json({ error: failure.message }, { status: failure.status === 401 ? 401 : 500 });
  }
}
