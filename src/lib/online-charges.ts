/**
 * What an online order adds beyond its pieces, decided on the server from
 * the owner's settings (Admin → Settings → Delivery charges).
 */
import type { PaymentInstrument } from "@/modules/promotions";

export interface DeliveryRates {
  standardShippingCents: number;
  expressShippingCents: number;
  codFeeCents: number;
}

/** Used only when no settings row exists yet — the rates the shop launched with. */
export const DEFAULT_DELIVERY_RATES: DeliveryRates = {
  standardShippingCents: 9_900,
  expressShippingCents: 19_900,
  codFeeCents: 0,
};

export const DELIVERY_RATES_SELECT = {
  standardShippingCents: true,
  expressShippingCents: true,
  codFeeCents: true,
} as const;

export function shippingCentsFor(
  method: "standard" | "express" | undefined,
  rates: Partial<DeliveryRates> | null | undefined,
): number {
  const r = { ...DEFAULT_DELIVERY_RATES, ...(rates ?? {}) };
  return method === "express" ? r.expressShippingCents : r.standardShippingCents;
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
