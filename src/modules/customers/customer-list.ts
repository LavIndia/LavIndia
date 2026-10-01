import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { IS_SALE_SQL, PAID_CENTS_SQL } from "@/modules/analytics/paid-amount-sql";
import { EMPTY_CUSTOMER_FILTERS, mobileSearchDigits, type CustomerFilters } from "./customer-filters";
import { DEFAULT_TIER_THRESHOLDS, tierSpendRange, type TierThresholds } from "./customer-tier";

export const CUSTOMERS_PAGE_SIZE = 25;

export interface CustomerListRow {
  id: string;
  name: string | null;
  email: string | null;
  mobile: string | null;
  createdAt: Date;
  orderCount: number;
  /** Shipped, out for delivery or delivered. */
  successfulOrders: number;
  /** Cancelled or refunded. */
  returnedOrders: number;
  /** What they actually paid across both channels, in paise. */
  totalSpent: number;
  /** What offers and discounts took off their orders, in paise. */
  totalDiscount: number;
}

export interface CustomerPage {
  customers: CustomerListRow[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

interface Paging {
  skip: number;
  take: number;
}

type UserRow = Pick<CustomerListRow, "id" | "name" | "email" | "mobile" | "createdAt">;

interface OrderFacts {
  orders: bigint;
  successful: bigint;
  returned: bigint;
  spent: bigint;
  discount: bigint;
}

/**
 * A client's orders are their website orders plus counter sales rung up
 * against their mobile number without an account — the same matching the
 * client segments use — so someone who buys at both is measured on all of it.
 */
const ORDER_OF_USER_SQL = Prisma.sql`(o."userId" = u."id"
  OR (o."userId" IS NULL
      AND NULLIF(TRIM(u."mobile"), '') IS NOT NULL
      AND TRIM(o."customerMobile") = TRIM(u."mobile")))`;

/**
 * Spend is what they actually paid (`paid-amount.ts`) on orders that are
 * sales; cancelled, refunded and unpaid orders add nothing.
 */
const FACTS_SQL = Prisma.sql`
  COUNT(o."id")::bigint AS orders,
  COUNT(o."id") FILTER (WHERE o."status" IN ('SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'))::bigint AS successful,
  COUNT(o."id") FILTER (WHERE o."status" IN ('CANCELLED', 'REFUNDED'))::bigint AS returned,
  COALESCE(SUM(${PAID_CENTS_SQL}) FILTER (WHERE ${IS_SALE_SQL}), 0)::bigint AS spent,
  COALESCE(SUM(o."discountCents") FILTER (WHERE ${IS_SALE_SQL}), 0)::bigint AS discount`;

const escapeLike = (text: string) => text.replace(/[\\%_]/g, (c) => `\\${c}`);

/** Registered clients matching the search, by name, email or mobile. */
function clientsWhere(q: string) {
  const role = Prisma.sql`u."role" = 'CUSTOMER'`;
  if (!q) return role;
  const pattern = `%${escapeLike(q)}%`;
  const digits = mobileSearchDigits(q);
  const byMobile = digits
    ? Prisma.sql`OR regexp_replace(COALESCE(u."mobile", ''), '\\D', '', 'g') LIKE ${`%${digits}%`}`
    : Prisma.empty;
  return Prisma.sql`${role} AND (u."name" ILIKE ${pattern} OR u."email" ILIKE ${pattern} ${byMobile})`;
}

function toRow(user: UserRow, f: OrderFacts | undefined): CustomerListRow {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    mobile: user.mobile,
    createdAt: user.createdAt,
    orderCount: Number(f?.orders ?? 0),
    successfulOrders: Number(f?.successful ?? 0),
    returnedOrders: Number(f?.returned ?? 0),
    totalSpent: Number(f?.spent ?? 0),
    totalDiscount: Number(f?.discount ?? 0),
  };
}

const pageSql = (paging?: Paging) =>
  paging ? Prisma.sql`LIMIT ${paging.take} OFFSET ${paging.skip}` : Prisma.empty;

/**
 * Every tier: the matching accounts (newest first, with the total), then one
 * grouped aggregate over only those clients' orders — two queries however
 * many clients, and on a page only that page's clients are aggregated.
 */
async function queryAllTiers(where: Prisma.Sql, paging?: Paging) {
  const users = await prisma.$queryRaw<(UserRow & { total: bigint })[]>`
    SELECT u."id", u."name", u."email", u."mobile", u."createdAt", COUNT(*) OVER ()::bigint AS total
    FROM "users" u
    WHERE ${where}
    ORDER BY u."createdAt" DESC, u."id" ASC
    ${pageSql(paging)}`;
  if (users.length === 0) return { rows: [], total: 0 };

  const facts = await prisma.$queryRaw<(OrderFacts & { userId: string })[]>`
    SELECT u."id" AS "userId", ${FACTS_SQL}
    FROM "users" u
    JOIN "orders" o ON ${ORDER_OF_USER_SQL}
    WHERE u."id" IN (${Prisma.join(users.map((u) => u.id))})
    GROUP BY u."id"`;
  const byUser = new Map(facts.map((f) => [f.userId, f]));
  return { rows: users.map((u) => toRow(u, byUser.get(u.id))), total: Number(users[0].total) };
}

/**
 * One tier: a tier is a band of spend, so the spend is aggregated for every
 * matching client in SQL, the band applied to it, and the page cut from what
 * is left — one query, and nothing but the page leaves the database.
 */
async function queryOneTier(where: Prisma.Sql, range: { min: number; max: number | null }, paging?: Paging) {
  const below = range.max === null ? Prisma.empty : Prisma.sql`AND spent < ${range.max}`;
  const rows = await prisma.$queryRaw<(UserRow & OrderFacts & { total: bigint })[]>`
    WITH facts AS (
      SELECT u."id", u."name", u."email", u."mobile", u."createdAt", ${FACTS_SQL}
      FROM "users" u
      LEFT JOIN "orders" o ON ${ORDER_OF_USER_SQL}
      WHERE ${where}
      GROUP BY u."id"
    )
    SELECT *, COUNT(*) OVER ()::bigint AS total
    FROM facts
    WHERE spent >= ${range.min} ${below}
    ORDER BY "createdAt" DESC, "id" ASC
    ${pageSql(paging)}`;
  return { rows: rows.map((r) => toRow(r, r)), total: rows.length ? Number(rows[0].total) : 0 };
}

function queryCustomers(filters: CustomerFilters, thresholds: TierThresholds, paging?: Paging) {
  const where = clientsWhere(filters.q);
  return filters.tier === "all"
    ? queryAllTiers(where, paging)
    : queryOneTier(where, tierSpendRange(filters.tier, thresholds), paging);
}

/**
 * Registered clients with their order history, newest first, narrowed by
 * `filters` — every one of them, for the CSV export.
 */
export async function listCustomers(
  filters: CustomerFilters = EMPTY_CUSTOMER_FILTERS,
  thresholds: TierThresholds = DEFAULT_TIER_THRESHOLDS,
): Promise<CustomerListRow[]> {
  return (await queryCustomers(filters, thresholds)).rows;
}

/** One page of `listCustomers`. A page past the end shows the last one. */
export async function getCustomerPage(
  requestedPage: number,
  filters: CustomerFilters = EMPTY_CUSTOMER_FILTERS,
  thresholds: TierThresholds = DEFAULT_TIER_THRESHOLDS,
): Promise<CustomerPage> {
  const pageFor = (page: number) =>
    queryCustomers(filters, thresholds, { skip: (page - 1) * CUSTOMERS_PAGE_SIZE, take: CUSTOMERS_PAGE_SIZE });

  let page = Math.max(1, requestedPage);
  let { rows, total } = await pageFor(page);
  // The total arrives with the rows, so a page past the end (an old link, or
  // a list that shrank) costs one more query, only then.
  if (rows.length === 0 && page > 1) {
    const { total: all } = await queryCustomers(filters, thresholds, { skip: 0, take: 1 });
    page = Math.max(1, Math.ceil(all / CUSTOMERS_PAGE_SIZE));
    ({ rows, total } = await pageFor(page));
  }
  const totalPages = Math.max(1, Math.ceil(total / CUSTOMERS_PAGE_SIZE));
  return { customers: rows, page, pageSize: CUSTOMERS_PAGE_SIZE, totalCount: total, totalPages };
}
