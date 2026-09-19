/**
 * Orders module — public surface.
 *
 * ONE order system for both channels. Other modules import from here and
 * nothing deeper.
 */
export type {
  CreateOrderInput,
  CreatedOrder,
  OrderLineInput,
  OrderLineSnapshot,
  OrderSource,
  OrderStatus,
  OrderTotals,
  OrdersPort,
  PaymentStatus,
  PosPaymentMethod,
} from "./contracts";
export { orderService } from "./order-service";
export { GST_RATE_BPS, priceLines, totalsFor } from "./pricing";
export { orderCustomerName, orderCustomerContact, WALK_IN_CUSTOMER_LABEL } from "./customer-display";
