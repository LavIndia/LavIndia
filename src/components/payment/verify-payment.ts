/**
 * Asks the server to confirm a gateway payment for one of our orders.
 *
 * Two good answers, not one: "paid" is the ordinary sale, and
 * "order-cancelled" means the money went through but the order had already
 * been cancelled — nothing ships and the payment is refunded. Anything else
 * throws, as a failed verification.
 */
export interface GatewayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export async function verifyPayment(
  response: GatewayResponse,
  orderId: string,
): Promise<"paid" | "order-cancelled"> {
  const verifyResponse = await fetch("/api/payment/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...response, orderId }),
  });
  if (!verifyResponse.ok) throw new Error("Payment verification failed");

  const body = (await verifyResponse.json().catch(() => ({}))) as { orderCancelled?: boolean };
  return body.orderCancelled ? "order-cancelled" : "paid";
}
