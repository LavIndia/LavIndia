/**
 * Creates the Razorpay QR for a counter bill.
 *
 * When the gateway is not configured, or QR codes are not switched on for the
 * account, this answers with a plain error and the counter falls back to the
 * UPI QR with manual confirmation — the shop can always trade.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiHandler } from "@/lib/api-handler";
import { requireAdmin } from "@/lib/require-admin";
import { readGatewayFailure } from "@/modules/payments/razorpay/gateway-error";
import { createPosQr } from "@/modules/payments/razorpay/pos-qr";
import { isDomainError } from "@/modules/_shared/errors";

const schema = z.object({
  amountCents: z.number().int().min(100),
  reference: z.string().trim().min(1).max(60),
});

export const POST = apiHandler(async (req: NextRequest) => {
  await requireAdmin("pos:sell");
  const input = schema.parse(await req.json());
  try {
    return NextResponse.json({ qr: await createPosQr(input.amountCents, input.reference) }, { status: 201 });
  } catch (error) {
    if (isDomainError(error)) throw error;
    const failure = readGatewayFailure(error);
    return NextResponse.json({ error: failure.message, code: "GATEWAY_UNAVAILABLE" }, { status: 502 });
  }
});
