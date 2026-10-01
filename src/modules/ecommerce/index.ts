/**
 * Ecommerce module — public surface.
 *
 * Owns the storefront shopping session and the checkout decision. Prices and
 * stock are resolved here, server side; the browser cart is intent only.
 */
export { checkoutService } from "./checkout-service";
export type { CheckoutLineInput, CheckoutValidation } from "./checkout-service";
export { settleGatewayPayment } from "./settle-gateway-payment";
export type { GatewayPayment, SettleOutcome } from "./settle-gateway-payment";
