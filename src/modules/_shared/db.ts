/**
 * The database handle every module's repository layer uses.
 *
 * `Tx` is the transaction-scoped client. Every service method that changes
 * more than one row accepts one, so a caller can compose several domains'
 * writes into a single atomic unit — a POS sale consumes stock, creates the
 * order and issues the invoice inside one transaction, or none of it happens.
 */
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export { prisma };

export type Tx = Prisma.TransactionClient;

/** Either a transaction client or the root client, for methods that work in both. */
export type Db = Tx | typeof prisma;

/**
 * Serializable isolation is what makes "two people sell the last item"
 * safe. Postgres will abort one of the two conflicting transactions rather
 * than let both commit, and the retry wrapper below turns that abort into a
 * transparent second attempt.
 */
export const SERIALIZABLE = {
  isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
} as const;

const SERIALIZATION_FAILURE = "40001";
const DEADLOCK_DETECTED = "40P01";

function isRetryableConflict(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // P2034 is Prisma's own "transaction conflict, please retry".
    if (error.code === "P2034") return true;
    const pgCode = (error.meta as { code?: string } | undefined)?.code;
    if (pgCode === SERIALIZATION_FAILURE || pgCode === DEADLOCK_DETECTED) return true;
  }
  const message = error instanceof Error ? error.message : "";
  return (
    message.includes(SERIALIZATION_FAILURE) ||
    message.includes("could not serialize access")
  );
}

/**
 * Runs `fn` in a serializable transaction, retrying only the specific
 * conflict Postgres raises when two transactions touched the same rows.
 * Business failures (insufficient stock, unknown barcode) are never retried
 * — they would fail identically every time.
 */
export async function withSerializableTransaction<T>(
  fn: (tx: Tx) => Promise<T>,
  options: { maxAttempts?: number; timeoutMs?: number } = {},
): Promise<T> {
  const maxAttempts = options.maxAttempts ?? 3;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await prisma.$transaction(fn, {
        ...SERIALIZABLE,
        timeout: options.timeoutMs ?? 10_000,
      });
    } catch (error) {
      if (!isRetryableConflict(error) || attempt === maxAttempts) throw error;
      lastError = error;
      // Brief jittered backoff so two colliding writers don't re-collide.
      await new Promise((resolve) => setTimeout(resolve, 25 * attempt + Math.random() * 25));
    }
  }

  throw lastError;
}
