import type { Prisma } from "@prisma/client";

/**
 * Everything the Orders screen can be narrowed by, in one place.
 *
 * There is ONE orders screen for both channels rather than a "Store POS" list
 * and an "Online Orders" list, because a counter sale and a web sale are the
 * same record with a different `source` — two screens would mean two queries
 * over one table, two places to add a column, and reports that quietly cover
 * only half the business.
 *
 * Kept as a pure module (no Prisma client, no React) so the page stays thin
 * and the translation from URL to query can be reasoned about on its own.
 */

/** A curated option list, so the UI and the query can never disagree. */
export interface FilterOption<T extends string = string> {
  value: T;
  label: string;
  /** Shown as a hint under the option where the label alone is ambiguous. */
  hint?: string;
}

export const ORDER_CHANNELS = [
  { value: "all", label: "All channels", hint: "Counter and web together" },
  { value: "STORE", label: "Walk-in", hint: "Sold at the counter" },
  { value: "ONLINE", label: "Online", hint: "Placed on the website" },
] as const satisfies readonly FilterOption[];

export const ORDER_STATUSES = [
  { value: "all", label: "Any stage" },
  { value: "PENDING", label: "Pending" },
  { value: "PROCESSING", label: "Processing" },
  { value: "SHIPPED", label: "Shipped" },
  { value: "OUT_FOR_DELIVERY", label: "Out for delivery" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "REFUNDED", label: "Refunded" },
] as const satisfies readonly FilterOption[];

export const PAYMENT_STATUSES = [
  { value: "all", label: "Any payment state" },
  { value: "COMPLETED", label: "Paid" },
  { value: "PENDING", label: "Awaiting payment" },
  { value: "FAILED", label: "Failed" },
  { value: "REFUNDED", label: "Refunded" },
] as const satisfies readonly FilterOption[];

/**
 * How the money arrived.
 *
 * Two things are being named at once here, and keeping them straight is the
 * whole point of this list:
 *
 * - **Where** the sale happened. The counter writes `CASH`/`UPI`/`CARD`
 *   against a POS bill; the website writes `cod`/`razorpay` against an online
 *   order. Same rupees, different books — a counter UPI payment lands in the
 *   shop account directly, while an online one arrives as a gateway
 *   settlement, net of fees and a day or two later.
 * - **What** the customer paid with. For counter sales the stored value is
 *   already the instrument. For website sales it is not: the checkout only
 *   records that the money went through the gateway, and the instrument is
 *   captured separately on the Payment record when the payment is verified.
 *
 * So the online option is deliberately *not* called "UPI" even though many of
 * those payments are UPI: it would read as a second, duplicate UPI filter
 * while actually meaning something different. It is named for what it
 * reliably is — paid online — and the order row shows the real instrument
 * once the gateway has reported it.
 *
 * Each option carries the raw values it covers rather than matching a single
 * string, which keeps the spelling inconsistency contained to this file.
 */
export const PAYMENT_METHODS = [
  { value: "all", label: "Any method", matches: [] as string[] },
  { value: "cash", label: "Cash", hint: "At the counter", matches: ["CASH"] },
  { value: "upi", label: "UPI", hint: "At the counter", matches: ["UPI"] },
  { value: "card", label: "Card", hint: "At the counter", matches: ["CARD"] },
  {
    value: "cod",
    label: "Cash on delivery",
    hint: "Website · collected by the courier",
    matches: ["cod"],
  },
  {
    value: "gateway",
    label: "Paid online",
    hint: "Website · card or UPI",
    matches: ["razorpay"],
  },
  { value: "other", label: "Other", matches: ["OTHER"] },
] as const;

/** Ready-made ranges, so the common questions are one tap rather than two dates. */
export const DATE_PRESETS = [
  { value: "all", label: "All time" },
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "fy", label: "This financial year" },
] as const satisfies readonly FilterOption[];

export interface OrderFilters {
  search: string;
  channel: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  categoryId: string;
  datePreset: string;
  /** Inclusive rupee bounds on the order's item total, as typed by the admin. */
  minAmount: string;
  maxAmount: string;
}

export type OrderFilterParams = Partial<Record<keyof OrderFilters, string>>;

export const EMPTY_FILTERS: OrderFilters = {
  search: "",
  channel: "all",
  status: "all",
  paymentStatus: "all",
  paymentMethod: "all",
  categoryId: "all",
  datePreset: "all",
  minAmount: "",
  maxAmount: "",
};

/** URL params → a complete, defaulted filter set. */
export function parseOrderFilters(params: OrderFilterParams): OrderFilters {
  return {
    search: params.search?.trim() ?? "",
    channel: params.channel ?? "all",
    status: params.status ?? "all",
    paymentStatus: params.paymentStatus ?? "all",
    paymentMethod: params.paymentMethod ?? "all",
    categoryId: params.categoryId ?? "all",
    datePreset: params.datePreset ?? "all",
    minAmount: params.minAmount?.trim() ?? "",
    maxAmount: params.maxAmount?.trim() ?? "",
  };
}

/** True when anything is narrowing the list, so the UI can offer "Clear". */
export function hasActiveFilters(filters: OrderFilters): boolean {
  return (Object.keys(EMPTY_FILTERS) as Array<keyof OrderFilters>).some(
    (key) => filters[key] !== EMPTY_FILTERS[key],
  );
}

/** Filters → a query string, dropping anything left at its default. */
export function filtersToQuery(filters: OrderFilters): string {
  const params = new URLSearchParams();
  for (const key of Object.keys(EMPTY_FILTERS) as Array<keyof OrderFilters>) {
    if (filters[key] !== EMPTY_FILTERS[key]) params.set(key, filters[key]);
  }
  return params.toString();
}

/**
 * The start of a preset range.
 *
 * The financial year runs April–March in India, which is the year an invoice
 * number is scoped to — so "this financial year" here means the same span as
 * the invoice sequence, and the two always agree.
 */
function startOfPreset(preset: string, now: Date): Date | null {
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (preset) {
    case "today":
      return midnight;
    case "7d":
      return new Date(midnight.getTime() - 6 * 86_400_000);
    case "30d":
      return new Date(midnight.getTime() - 29 * 86_400_000);
    case "90d":
      return new Date(midnight.getTime() - 89 * 86_400_000);
    case "fy": {
      const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
      return new Date(year, 3, 1);
    }
    default:
      return null;
  }
}

/** Rupees as typed → paisa, or undefined when blank or not a number. */
function rupeesToPaisa(value: string): number | undefined {
  if (!value) return undefined;
  const rupees = Number(value);
  return Number.isFinite(rupees) && rupees >= 0 ? Math.round(rupees * 100) : undefined;
}

/**
 * Filters → the Prisma `where` for the orders list.
 *
 * `now` is passed in rather than read here so the same filters always produce
 * the same query for a given moment, which keeps this testable.
 */
export function orderWhere(filters: OrderFilters, now: Date = new Date()): Prisma.OrderWhereInput {
  const where: Prisma.OrderWhereInput = {};

  if (filters.search) {
    where.OR = [
      { orderNumber: { contains: filters.search, mode: "insensitive" } },
      { user: { email: { contains: filters.search, mode: "insensitive" } } },
      { user: { name: { contains: filters.search, mode: "insensitive" } } },
      // A counter sale has no linked account, so its customer lives in the
      // order's own snapshot fields and has to be searched there too.
      { customerName: { contains: filters.search, mode: "insensitive" } },
      { customerMobile: { contains: filters.search, mode: "insensitive" } },
      { invoice: { invoiceNumber: { contains: filters.search, mode: "insensitive" } } },
    ];
  }

  if (filters.channel !== "all") {
    where.source = filters.channel as "ONLINE" | "STORE";
  }

  if (filters.status !== "all") {
    where.status = filters.status as Prisma.OrderWhereInput["status"];
  }

  if (filters.paymentStatus !== "all") {
    where.paymentStatus = filters.paymentStatus as Prisma.OrderWhereInput["paymentStatus"];
  }

  if (filters.paymentMethod !== "all") {
    const option = PAYMENT_METHODS.find((method) => method.value === filters.paymentMethod);
    if (option && option.matches.length > 0) {
      where.paymentMethod = { in: [...option.matches] };
    }
  }

  // A category is a property of the items, not the order, so this asks for
  // orders containing at least one item from it. An order spanning two
  // categories therefore appears under both, which is the honest answer.
  if (filters.categoryId !== "all") {
    where.items = { some: { product: { categoryId: filters.categoryId } } };
  }

  const from = startOfPreset(filters.datePreset, now);
  if (from) {
    where.createdAt = { gte: from };
  }

  const min = rupeesToPaisa(filters.minAmount);
  const max = rupeesToPaisa(filters.maxAmount);
  if (min !== undefined || max !== undefined) {
    where.totalCents = {
      ...(min !== undefined ? { gte: min } : {}),
      ...(max !== undefined ? { lte: max } : {}),
    };
  }

  return where;
}
