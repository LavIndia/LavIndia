/**
 * The one place Razorpay credentials are read, and the one place a Razorpay
 * signature is checked.
 *
 * Two spellings of the key are accepted — RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET
 * (Razorpay's own names) first, then RAZORPAY_API_KEY / RAZORPAY_SECRET — so a
 * deployment is not broken by which one somebody typed. The secret never leaves
 * the server; only the key id is ever handed to the browser.
 */
import crypto from "crypto";
import Razorpay from "razorpay";

export interface RazorpayCredentials {
  keyId: string;
  keySecret: string;
}

export function razorpayCredentials(): RazorpayCredentials | null {
  const keyId = (process.env.RAZORPAY_KEY_ID ?? process.env.RAZORPAY_API_KEY ?? "").trim();
  const keySecret = (process.env.RAZORPAY_KEY_SECRET ?? process.env.RAZORPAY_SECRET ?? "").trim();
  return keyId && keySecret ? { keyId, keySecret } : null;
}

let cached: { credentials: RazorpayCredentials; client: Razorpay } | null = null;

/** A configured SDK client, or null when no credentials are set. */
export function razorpayClient(): { client: Razorpay; keyId: string } | null {
  const credentials = razorpayCredentials();
  if (!credentials) return null;
  if (!cached || cached.credentials.keySecret !== credentials.keySecret || cached.credentials.keyId !== credentials.keyId) {
    cached = {
      credentials,
      client: new Razorpay({ key_id: credentials.keyId, key_secret: credentials.keySecret }),
    };
  }
  return { client: cached.client, keyId: credentials.keyId };
}

/** Constant-time comparison of two hex digests; false when lengths differ. */
function safeEqualHex(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function hmac(secret: string, payload: string | Buffer): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

/** The signature Razorpay Checkout returns: HMAC-SHA256(order_id|payment_id, key secret). */
export function isValidCheckoutSignature(orderId: string, paymentId: string, signature: string): boolean {
  const credentials = razorpayCredentials();
  if (!credentials) return false;
  return safeEqualHex(hmac(credentials.keySecret, `${orderId}|${paymentId}`), signature);
}

/** The webhook secret is its own value, set on the Razorpay dashboard — not the API secret. */
export function webhookSecret(): string | null {
  return process.env.RAZORPAY_WEBHOOK_SECRET?.trim() || null;
}

/** X-Razorpay-Signature is HMAC-SHA256 of the RAW request body with the webhook secret. */
export function isValidWebhookSignature(rawBody: string, signature: string | null): boolean {
  const secret = webhookSecret();
  if (!secret || !signature) return false;
  return safeEqualHex(hmac(secret, rawBody), signature);
}
