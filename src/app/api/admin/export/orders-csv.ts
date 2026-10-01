import { unparse } from "papaparse";
import { prisma } from "@/lib/prisma";
import { SALE_STATUSES, orderPaidCents } from "@/modules/analytics/paid-amount";
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
  "Credit note number",
  "Date",
  "Channel",
  "Customer",
  "Email",
  "Mobile",
  "Status",
  "Payment",
  "Paid with",
  "Pieces",
  "Tag value (₹)",
  "Amount paid (₹)",
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

const SALES = new Set<string>(SALE_STATUSES);

/** Paise → a plain rupee figure for a spreadsheet cell. */
function rupees(paise: number): string {
  return (paise / 100).toFixed(2);
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
 *
 * Two money columns, named so neither is mistaken for the other: "Tag value"
 * is the pieces at list price, before any discount, GST or delivery; "Amount
 * paid" is what the client actually paid (see `paid-amount.ts`) and is zero
 * for an order that is not a sale — cancelled, refunded or still unpaid — so
 * the column adds up to the Dashboard's sales for the same orders.
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
      discountCents: true,
      shippingCents: true,
      codFeeCents: true,
      taxCents: true,
      taxIncluded: true,
      customerName: true,
      customerMobile: true,
      user: { select: { name: true, email: true, mobile: true } },
      items: { select: { quantity: true } },
      payment: { select: { method: true, instrumentDetail: true } },
      invoice: {
        select: {
          invoiceNumber: true,
          creditNotes: { select: { creditNoteNumber: true }, orderBy: { issuedAt: "asc" }, take: 1 },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const rows = orders.map((order) => ({
    "Order number": order.orderNumber,
    "Invoice number": order.invoice?.invoiceNumber ?? "",
    "Credit note number": order.invoice?.creditNotes[0]?.creditNoteNumber ?? "",
    Date: order.createdAt.toISOString(),
    Channel: channelLabel(order.source),
    Customer: orderCustomerName(order),
    Email: order.user?.email ?? "",
    Mobile: order.customerMobile ?? order.user?.mobile ?? "",
    Status: orderStatusLabel(order.status),
    Payment: paymentStatusLabel(order.paymentStatus),
    "Paid with": paidWith(order),
    Pieces: order.items.reduce((total, item) => total + item.quantity, 0),
    "Tag value (₹)": rupees(order.totalCents),
    "Amount paid (₹)": rupees(SALES.has(order.status) ? orderPaidCents(order) : 0),
  }));

  // Headers even when nothing matches, so an empty export still reads as one.
  return rows.length > 0 ? unparse(rows) : unparse({ fields: EMPTY_HEADERS, data: [] });
}
