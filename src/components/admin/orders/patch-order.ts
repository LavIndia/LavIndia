/**
 * The one call the Orders screen makes to change an order: its stage, and a
 * refund recorded with it. Returns the server's own words on failure, so a
 * refusal such as "this order's invoice was credited" reaches the admin
 * rather than a generic "could not update".
 */
import type { OrderStatus } from "./order-types";

export interface RefundPayload {
  amountCents: number;
  method: string;
  reference?: string;
}

export async function patchOrder(
  orderId: string,
  status: OrderStatus,
  refund?: RefundPayload,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const res = await fetch(`/api/admin/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(refund ? { status, refund } : { status }),
    });
    if (res.ok) return { ok: true };
    const body = (await res.json().catch(() => ({}))) as {
      error?: string;
      details?: Array<{ message?: string }>;
    };
    const detail = body.details?.[0]?.message;
    return { ok: false, error: detail ?? body.error ?? "Could not update the order" };
  } catch {
    return { ok: false, error: "Could not update the order" };
  }
}
