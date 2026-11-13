import { NextRequest, NextResponse } from "next/server";
import { apiHandler } from "@/lib/api-handler";
import { requireAdmin } from "@/lib/require-admin";
import { checkPosQr, closePosQr } from "@/modules/payments/razorpay/pos-qr";

export const dynamic = "force-dynamic";

// GET — has this counter QR been paid? Polled by the bill screen.
export const GET = apiHandler(async (_req: NextRequest, { params }: { params: Promise<{ qrId: string }> }) => {
  await requireAdmin("pos:sell");
  const { qrId } = await params;
  return NextResponse.json({ status: await checkPosQr(qrId) });
});

// DELETE — the cashier backed out of the bill, so the QR should stop working.
export const DELETE = apiHandler(async (_req: NextRequest, { params }: { params: Promise<{ qrId: string }> }) => {
  await requireAdmin("pos:sell");
  const { qrId } = await params;
  await closePosQr(qrId);
  return NextResponse.json({ closed: true });
});
