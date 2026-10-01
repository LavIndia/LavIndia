import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { chargedLinesCte } from "./paid-amount-sql";

export interface TopProductRow {
  /** Null when the product has since been deleted from the catalogue. */
  productId: string | null;
  name: string;
  quantitySold: number;
  /** What clients paid for these pieces, GST included, in paise. */
  revenueCents: number;
}

/**
 * Best sellers by pieces sold, both channels, sale orders only.
 *
 * Revenue is each line's charged amount — every unit, not one per line —
 * from `chargedLinesCte`. A deleted product's lines have no product id and
 * are kept together under the name they were sold as; a product that has
 * been renamed stays one row, shown under its most recent name.
 */
export async function getTopProducts(limit: number | null = 10): Promise<TopProductRow[]> {
  // Null is every product that sold, for the export.
  const cap = limit === null ? Prisma.empty : Prisma.sql`LIMIT ${limit}`;
  const rows = await prisma.$queryRaw<
    Array<{ productId: string | null; name: string; quantity: bigint; revenue: bigint }>
  >`
    WITH ${chargedLinesCte()}
    SELECT "productId",
           (ARRAY_AGG("name" ORDER BY "createdAt" DESC))[1] AS name,
           SUM("quantity")::bigint                          AS quantity,
           ROUND(SUM(charged_cents))::bigint                AS revenue
    FROM charged_lines
    GROUP BY "productId", CASE WHEN "productId" IS NULL THEN "name" END
    ORDER BY quantity DESC, revenue DESC
    ${cap}`;

  return rows.map((row) => ({
    productId: row.productId,
    name: row.name,
    quantitySold: Number(row.quantity),
    revenueCents: Number(row.revenue),
  }));
}
