/**
 * Invoice numbering.
 *
 * Deliberately NOT derived from the order number. Indian GST rules require
 * invoice numbers to be sequential, unbroken and unique within a financial
 * year, which a random order id cannot satisfy. So an invoice carries its own
 * identifier:
 *
 *     INV/26-27/000123
 *
 * The counter is a single row per financial year, incremented inside the same
 * transaction that writes the invoice and under a row lock — so two
 * simultaneous sales cannot be handed the same number, and a gap cannot open
 * up because a number was allocated and then rolled back separately.
 */
import { Prisma } from "@prisma/client";
import type { Tx } from "../../_shared/db";

/**
 * The Indian financial year runs April to March, so a sale in March 2027
 * belongs to 26-27 while one in April 2027 starts 27-28.
 */
export function financialYearFor(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0 = January
  const startYear = month >= 3 ? year : year - 1;
  const endYear = startYear + 1;
  return `${String(startYear).slice(-2)}-${String(endYear).slice(-2)}`;
}

export function formatInvoiceNumber(financialYear: string, sequence: number): string {
  return `INV/${financialYear}/${String(sequence).padStart(6, "0")}`;
}

export interface AllocatedInvoiceNumber {
  invoiceNumber: string;
  financialYear: string;
  sequence: number;
}

/**
 * Takes the next number for a financial year.
 *
 * MUST be called inside the transaction that creates the invoice. The
 * UPDATE … RETURNING both increments and reads under a single row lock, so
 * concurrent callers queue rather than racing; a caller that later rolls back
 * releases its number by rolling back the counter with it.
 */
export async function allocateInvoiceNumber(
  tx: Tx,
  issuedAt: Date = new Date(),
): Promise<AllocatedInvoiceNumber> {
  const financialYear = financialYearFor(issuedAt);

  // Create the year's counter if this is its first invoice. Doing it as an
  // INSERT … ON CONFLICT DO NOTHING avoids a read-then-write race on the
  // very first sale of a new financial year.
  await tx.$executeRaw`
    INSERT INTO "invoice_sequences" ("financialYear", "lastNumber", "updatedAt")
    VALUES (${financialYear}, 0, NOW())
    ON CONFLICT ("financialYear") DO NOTHING
  `;

  const rows = await tx.$queryRaw<{ lastNumber: number }[]>(Prisma.sql`
    UPDATE "invoice_sequences"
       SET "lastNumber" = "lastNumber" + 1,
           "updatedAt" = NOW()
     WHERE "financialYear" = ${financialYear}
    RETURNING "lastNumber"
  `);

  const sequence = rows[0]?.lastNumber;
  if (!sequence) {
    throw new Error(`Could not allocate an invoice number for ${financialYear}`);
  }

  return {
    invoiceNumber: formatInvoiceNumber(financialYear, sequence),
    financialYear,
    sequence,
  };
}
