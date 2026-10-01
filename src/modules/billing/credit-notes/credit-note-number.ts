/**
 * Credit note numbering.
 *
 * A credit note is a GST document in its own right, so it carries its own
 * sequential, unbroken number within the financial year — never a reuse of
 * the invoice series:
 *
 *     CN/26-27/000001
 *
 * The locking is the invoice counter's (see invoices/invoice-number.ts): one
 * row per financial year, incremented with UPDATE … RETURNING inside the
 * transaction that writes the note, so two notes can never share a number and
 * a rolled-back note gives its number back with it.
 */
import { Prisma } from "@prisma/client";
import type { Tx } from "../../_shared/db";
import { financialYearFor } from "../invoices/invoice-number";

export function formatCreditNoteNumber(financialYear: string, sequence: number): string {
  return `CN/${financialYear}/${String(sequence).padStart(6, "0")}`;
}

export interface AllocatedCreditNoteNumber {
  creditNoteNumber: string;
  financialYear: string;
  sequence: number;
}

/** Takes the next credit note number. MUST run inside the issuing transaction. */
export async function allocateCreditNoteNumber(
  tx: Tx,
  issuedAt: Date = new Date(),
): Promise<AllocatedCreditNoteNumber> {
  const financialYear = financialYearFor(issuedAt);

  // The year's first note creates its counter without a read-then-write race.
  await tx.$executeRaw`
    INSERT INTO "credit_note_sequences" ("financialYear", "lastNumber", "updatedAt")
    VALUES (${financialYear}, 0, NOW())
    ON CONFLICT ("financialYear") DO NOTHING
  `;

  const rows = await tx.$queryRaw<{ lastNumber: number }[]>(Prisma.sql`
    UPDATE "credit_note_sequences"
       SET "lastNumber" = "lastNumber" + 1,
           "updatedAt" = NOW()
     WHERE "financialYear" = ${financialYear}
    RETURNING "lastNumber"
  `);

  const sequence = rows[0]?.lastNumber;
  if (!sequence) {
    throw new Error(`Could not allocate a credit note number for ${financialYear}`);
  }

  return {
    creditNoteNumber: formatCreditNoteNumber(financialYear, sequence),
    financialYear,
    sequence,
  };
}
