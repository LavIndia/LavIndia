/**
 * Orders module — public surface.
 *
 * ONE order system for both channels. Other modules import from here and
 * nothing deeper.
 */
export type {
  CreateOrderInput,
  CreatedOrder,
  LineAllocation,
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
export { changeOrderStatus, paymentStatusAfter } from "./order-status";
export { recordRefund, refundInputSchema } from "./order-refund";
export type { RefundInput } from "./order-refund";
export {
  canRecordRefund,
  isPaidAfterCancellation,
  isRefundOwed,
  PAID_AFTER_CANCELLATION,
} from "./refund-state";
export { GST_RATE_BPS } from "./pricing";
export { quoteCart } from "./quote";
export type { Quote, QuoteInput } from "./quote";
export { persistOrderLines, appliedSnapshot } from "./persist-lines";
export { orderCustomerName, orderCustomerContact, WALK_IN_CUSTOMER_LABEL } from "./customer-display";
