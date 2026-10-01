import { unparse } from "papaparse";
import { prisma } from "@/lib/prisma";
import { orderCustomerName } from "@/modules/orders/customer-display";
import {
  EMPTY_FILTERS,
  orderWhere,
  parseOrderFilters,
  type OrderFilterParams,
  type OrderFilters,
} from "@/modules/orders/order-filters";
import {
  channelLabel,
  orderStatusLabel,
  paymentDescription,
  paymentStatusLabel,
} from "@/modules/orders/order-labels";

/** The filter keys the Orders screen puts in its URL — and nothing else. */
const FILTER_KEYS = Object.keys(EMPTY_FILTERS) as Array<keyof OrderFilters>;

const EMPTY_HEADERS = [
  "Order number",
  "Invoice number",
  "Date",
  "Channel",
  "Customer",
  "Email",
  "Mobile",
  "Status",
  "Payment",
  "Paid with",
  "Pieces",
  "Total (₹)",
];

/** The export URL's query → the same filters the Orders screen parsed. */
export function orderFiltersFrom(searchParams: URLSearchParams): OrderFilters {
  const params: OrderFilterParams = {};
  for (const key of FILTER_KEYS) {
    const value = searchParams.get(key);
    if (value !== null) params[key] = value;
  }
  return parseOrderFilters(params);
}

/** The instrument, or blank when none is known — a CSV cell needs no "—". */
function paidWith(order: Parameters<typeof paymentDescription>[0]): string {
  const description = paymentDescription(order);
  return description === "—" ? "" : description;
}

/**
 * The orders CSV — exactly the orders the screen is showing.
 *
 * Built from the same `orderWhere` the list uses, so an export taken with
 * "Walk-in · Last 30 days" filtered on contains those orders and no others.
 * Unlike the screen it is not capped: the export is how the full set leaves.
 * One query; every code is written in the same words the screen uses.
 */
export async function exportOrdersCsv(filters: OrderFilters): Promise<string> {
  const orders = await prisma.order.findMany({
    where: orderWhere(filters),
    select: {
      orderNumber: true,
      createdAt: true,
      source: true,
      status: true,
      paymentStatus: true,
      paymentMethod: true,
      totalCents: true,
      customerName: true,
      customerMobile: true,
      user: { select: { name: true, email: true, mobile: true } },
      items: { select: { quantity: true } },
      payment: { select: { method: true, instrumentDetail: true } },
      invoice: { select: { invoiceNumber: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const rows = orders.map((order) => ({
    "Order number": order.orderNumber,
    "Invoice number": order.invoice?.invoiceNumber ?? "",
    Date: order.createdAt.toISOString(),
    Channel: channelLabel(order.source),
    Customer: orderCustomerName(order),
    Email: order.user?.email ?? "",
    Mobile: order.customerMobile ?? order.user?.mobile ?? "",
    Status: orderStatusLabel(order.status),
    Payment: paymentStatusLabel(order.paymentStatus),
    "Paid with": paidWith(order),
    Pieces: order.items.reduce((total, item) => total + item.quantity, 0),
    "Total (₹)": (order.totalCents / 100).toFixed(2),
  }));

  // Headers even when nothing matches, so an empty export still reads as one.
  return rows.length > 0 ? unparse(rows) : unparse({ fields: EMPTY_HEADERS, data: [] });
}
