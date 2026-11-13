/**
 * What went wrong when a Razorpay call failed, in terms a route can answer
 * with. The SDK rejects with a plain object — { statusCode, error: { code,
 * description } } — not an Error, so it has to be read defensively.
 */
export interface GatewayFailure {
  /** 401 when Razorpay rejected our credentials, otherwise 502. */
  status: 401 | 502;
  message: string;
}

export function readGatewayFailure(error: unknown): GatewayFailure {
  const shaped = error as { statusCode?: number; error?: { description?: string } } | null;
  if (shaped?.statusCode === 401) {
    return { status: 401, message: "The payment gateway rejected our credentials" };
  }
  const description = shaped?.error?.description;
  // Razorpay answers a feature the account has not been given with a bare 404.
  if (description?.includes("requested URL was not found")) {
    return { status: 502, message: "This feature is not switched on for your Razorpay account yet — ask Razorpay to enable it" };
  }
  return {
    status: 502,
    message: description ? `The payment gateway said: ${description}` : "The payment gateway could not be reached",
  };
}
