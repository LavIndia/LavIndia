/**
 * What an online order adds beyond its pieces, decided on the server.
 */
import type { PaymentInstrument } from "@/modules/promotions";

/** Standard ₹99, express ₹199 — the rates the checkout has always shown. */
export function shippingCentsFor(method: "standard" | "express" | undefined): number {
  return method === "express" ? 19_900 : 9_900;
}

/**
 * The instrument an offer can be conditioned on. Before the gateway
 * confirms, UPI and card are what the client chose; cash on delivery is COD.
 */
export function onlinePaymentInstrument(
  method: "upi" | "card" | "cod" | undefined,
): PaymentInstrument | null {
  if (method === "cod") return "COD";
  if (method === "card") return "CARD";
  if (method === "upi") return "UPI";
  return null;
}
