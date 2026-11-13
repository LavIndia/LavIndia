import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isDomainError, toErrorResponse } from "@/modules/_shared/errors";
import { cancelPaymentLink } from "@/modules/payments/razorpay/payment-links";

// DELETE /api/admin/orders/[id]/payment-links/[linkId] — cancel an open link or QR
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; linkId: string }> }) {
  const session = await auth();
  if (session?.user.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { linkId } = await params;
    return NextResponse.json({ link: await cancelPaymentLink(linkId) });
  } catch (error) {
    if (isDomainError(error)) {
      const { body, status } = toErrorResponse(error);
      return NextResponse.json(body, { status });
    }
    console.error("Payment link cancel failed:", error);
    return NextResponse.json({ error: "Could not cancel the payment link" }, { status: 500 });
  }
}
