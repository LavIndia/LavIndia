import { NextRequest, NextResponse } from "next/server";
import { revalidateStockViews } from "@/lib/catalog-cache";
import { isValidWebhookSignature, webhookSecret } from "@/modules/payments/razorpay/config";
import { handleWebhookEvent, type WebhookEvent } from "@/modules/payments/razorpay/webhook-events";

// Razorpay calls this server-to-server. Never cached, and the body must be
// read raw: the signature is over the exact bytes, not over parsed JSON.
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // Refuse rather than accept unsigned calls. Anyone can POST to this URL.
  if (!webhookSecret()) {
    return NextResponse.json({ error: "Webhook is not configured" }, { status: 503 });
  }

  const rawBody = await req.text();
  if (!isValidWebhookSignature(rawBody, req.headers.get("x-razorpay-signature"))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: WebhookEvent;
  try {
    event = JSON.parse(rawBody) as WebhookEvent;
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  try {
    const result = await handleWebhookEvent(event);
    if (result === "settled") revalidateStockViews();
    return NextResponse.json({ received: true, result });
  } catch (error) {
    // 500 so Razorpay retries: a payment that could not be recorded must not
    // be dropped on the floor.
    console.error("Razorpay webhook failed:", event.event, error);
    return NextResponse.json({ error: "Could not process the event" }, { status: 500 });
  }
}
