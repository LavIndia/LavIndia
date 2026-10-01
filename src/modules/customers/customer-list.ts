import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { IS_SALE_SQL, PAID_CENTS_SQL } from "@/modules/analytics/paid-amount-sql";

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

interface OrderFacts {
  userId: string;
  orders: bigint;
  successful: bigint;
  returned: bigint;
  spent: bigint;
  discount: bigint;
}

/**
 * Registered clients with their order history: the accounts, then one
 * grouped aggregate over their orders — two queries however many clients.
 *
 * A client's orders are their website orders plus counter sales rung up
 * against their mobile number without an account — the same matching the
 * client segments use — so someone who buys at both is measured on all of
 * it. Spend is what they actually paid (`paid-amount.ts`) on orders that are
 * sales; cancelled, refunded and unpaid orders add nothing.
 */
export async function listCustomers(paging?: { skip: number; take: number }): Promise<CustomerListRow[]> {
  const users = await prisma.user.findMany({
    where: { role: "CUSTOMER" },
    select: { id: true, name: true, email: true, mobile: true, createdAt: true },
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    ...paging,
  });
  if (users.length === 0) return [];

  const facts = await prisma.$queryRaw<OrderFacts[]>`
    SELECT u."id" AS "userId",
           COUNT(o."id")::bigint AS orders,
           COUNT(o."id") FILTER (
             WHERE o."status" IN ('SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'))::bigint AS successful,
           COUNT(o."id") FILTER (
             WHERE o."status" IN ('CANCELLED', 'REFUNDED'))::bigint AS returned,
           COALESCE(SUM(${PAID_CENTS_SQL}) FILTER (WHERE ${IS_SALE_SQL}), 0)::bigint AS spent,
           COALESCE(SUM(o."discountCents") FILTER (WHERE ${IS_SALE_SQL}), 0)::bigint AS discount
    FROM "users" u
    JOIN "orders" o
      ON o."userId" = u."id"
      OR (o."userId" IS NULL
          AND NULLIF(TRIM(u."mobile"), '') IS NOT NULL
          AND TRIM(o."customerMobile") = TRIM(u."mobile"))
    WHERE ${paging ? Prisma.sql`u."id" IN (${Prisma.join(users.map((u) => u.id))})` : Prisma.sql`u."role" = 'CUSTOMER'`}
    GROUP BY u."id"`;
  const byUser = new Map(facts.map((f) => [f.userId, f]));

  return users.map((user) => {
    const f = byUser.get(user.id);
    return {
      ...user,
      orderCount: Number(f?.orders ?? 0),
      successfulOrders: Number(f?.successful ?? 0),
      returnedOrders: Number(f?.returned ?? 0),
      totalSpent: Number(f?.spent ?? 0),
      totalDiscount: Number(f?.discount ?? 0),
    };
  });
}

/** One page of `listCustomers`, newest clients first. */
export async function getCustomerPage(requestedPage: number): Promise<CustomerPage> {
  const totalCount = await prisma.user.count({ where: { role: "CUSTOMER" } });
  const totalPages = Math.max(1, Math.ceil(totalCount / CUSTOMERS_PAGE_SIZE));
  const page = Math.min(Math.max(1, requestedPage), totalPages);
  const customers = await listCustomers({
    skip: (page - 1) * CUSTOMERS_PAGE_SIZE,
    take: CUSTOMERS_PAGE_SIZE,
  });
  return { customers, page, pageSize: CUSTOMERS_PAGE_SIZE, totalCount, totalPages };
}
