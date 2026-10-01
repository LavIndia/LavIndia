/**
 * Moving an order from one status to another, and everything that has to
 * move with it.
 *
 * A status is not just a label. Cancelling or refunding an order puts its
 * pieces back on the shelf, gives its offer uses back, credits its invoice and
 * says what became of the payment; bringing it back takes all of that again. Dispatching a
 * cash-on-delivery order raises its invoice, and delivering it records the
 * cash as collected. All of it happens in the caller's transaction, under a
 * lock on the order, so two people pressing the button at once cannot apply
 * any of it twice.
 */
import { Prisma, type OrderStatus, type PaymentStatus } from "@prisma/client";
import type { Tx } from "../_shared/db";
import { DomainError } from "../_shared/errors";
import { OrderId } from "../_shared/ids";
import { billingService } from "../billing/billing-service";
import { issueCreditNoteForOrder } from "../billing/credit-notes/credit-note-service";
import { withdrawSoldOutRetiredProducts } from "../catalog";
import { retakeOrderStock, returnOrderStock } from "../inventory";
import { countOrderRedemption, releaseOrderRedemption } from "../promotions/repository";
import { assertReinstatable } from "./order-closure";

const CLOSED: readonly OrderStatus[] = ["CANCELLED", "REFUNDED"];
/** The moment a cash-on-delivery parcel leaves the shop — when its invoice is raised. */
const DISPATCHED: readonly OrderStatus[] = ["SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"];

interface Current {
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: string | null;
  source: "ONLINE" | "STORE";
}

/**
 * What the payment has become once the order moves to `next`.
 *
 *   - Closed before any money arrived: the payment will never happen (FAILED).
 *   - Refunded after it was paid: REFUNDED. A paid order that is only
 *     cancelled stays COMPLETED until the money is actually sent back, so the
 *     refund still owed is visible.
 *   - Brought back from cancellation: a payment written off is owed again.
 *   - A cash-on-delivery order delivered: the cash is in hand.
 */
export function paymentStatusAfter(current: Current, next: OrderStatus): PaymentStatus {
  const paid = current.paymentStatus;
  if (CLOSED.includes(next)) {
    if (paid === "PENDING") return "FAILED";
    if (paid === "COMPLETED" && next === "REFUNDED") return "REFUNDED";
    return paid;
  }
  const owed = CLOSED.includes(current.status) && paid === "FAILED" ? "PENDING" : paid;
  if (next === "DELIVERED" && current.paymentMethod === "cod" && owed === "PENDING") {
    return "COMPLETED";
  }
  return owed;
}

/** Applies a status change and its consequences. Safe to repeat. */
export async function changeOrderStatus(
  tx: Tx,
  orderId: string,
  status: OrderStatus,
  actorId?: string,
) {
  // Taken first and held to the end of the transaction: the stock, offer and
  // payment changes below all read the order's state before writing it.
  const [current] = await tx.$queryRaw<Current[]>(Prisma.sql`
    SELECT "status", "paymentStatus", "paymentMethod", "source"
      FROM "orders" WHERE "id" = ${orderId} FOR UPDATE
  `);
  if (!current) throw new DomainError("ORDER_NOT_FOUND", "That order no longer exists");
  // A credited invoice, or a payment that arrived after the order was
  // cancelled, means the order cannot simply be brought back.
  if (CLOSED.includes(current.status) && !CLOSED.includes(status)) {
    await assertReinstatable(tx, orderId);
  }

  const paymentStatus = paymentStatusAfter(current, status);
  const updated = await tx.order.update({
    where: { id: orderId },
    data: { status, paymentStatus },
    include: { user: true, items: true },
  });
  if (paymentStatus !== current.paymentStatus) {
    await tx.payment.updateMany({ where: { orderId }, data: { status: paymentStatus } });
  }

  if (CLOSED.includes(status)) {
    // A cancelled or refunded order gives its offer uses and its pieces
    // back, and a billed one has its invoice credited. All three are
    // once-only, so cancel-then-refund returns nothing twice and issues one
    // credit note.
    const reason = status === "REFUNDED" ? "Order refunded" : "Order cancelled";
    await releaseOrderRedemption(tx, orderId);
    const returned = await returnOrderStock(tx, orderId, { actorId, reason });
    await issueCreditNoteForOrder(tx, orderId, reason, actorId);
    return { order: updated, stockMoved: returned > 0 };
  }

  let stockMoved = false;
  if (CLOSED.includes(current.status)) {
    const ordered = updated.items
      .filter((item) => item.variantId)
      .map((item) => ({ variantId: item.variantId!, quantity: item.quantity }));
    const retaken = await retakeOrderStock(tx, orderId, ordered, {
      actorId,
      reason: "Order reinstated",
    });
    if (retaken.length > 0) {
      await withdrawSoldOutRetiredProducts(tx, { variantIds: retaken });
      stockMoved = true;
    }
  }

  if (
    updated.paymentStatus === "COMPLETED" ||
    updated.paymentMethod === "cod" ||
    updated.source === "STORE"
  ) {
    await countOrderRedemption(tx, orderId);
  }

  // Cash on delivery is billed when the parcel goes out, like any sale of
  // goods; an online payment was billed when it was confirmed, and a counter
  // sale at the till. One invoice per order — a repeat returns the first.
  if (updated.source === "ONLINE" && updated.paymentMethod === "cod" && DISPATCHED.includes(status)) {
    await billingService.issueInvoiceForOrder(OrderId(orderId), actorId, tx);
  }

  return { order: updated, stockMoved };
}
