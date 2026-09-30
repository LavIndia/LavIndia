/**
 * Codes for CODE offers: the offer's one shared code, and batches of unique
 * codes generated for handing out one per client.
 */
import { randomInt } from "crypto";
import { prisma } from "../_shared/db";
import { DomainError } from "../_shared/errors";

// No 0/O or 1/I: codes are read aloud at the counter and typed from a card.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function randomCode(prefix = "", length = 6): string {
  let body = "";
  for (let i = 0; i < length; i += 1) body += ALPHABET[randomInt(ALPHABET.length)];
  const clean = prefix.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
  return clean ? `${clean}-${body}` : body;
}

export interface CodeBatchSummary {
  batch: string;
  createdAt: Date;
  total: number;
  used: number;
  usesEach: number | null;
  codes: Array<{ code: string; usedCount: number }>;
}

/**
 * Generates `count` unique codes for an offer. Codes that happen to collide
 * with an existing one are simply regenerated, so the batch always has
 * exactly the number asked for.
 */
export async function generateCodes(
  promotionId: string,
  { count, prefix, usesEach }: { count: number; prefix?: string; usesEach: number | null },
): Promise<string> {
  if (!Number.isInteger(count) || count < 1 || count > 1000) {
    throw new DomainError("VALIDATION_FAILED", "Generate between 1 and 1,000 codes at a time");
  }
  const offer = await prisma.promotion.findUnique({ where: { id: promotionId }, select: { trigger: true } });
  if (!offer) throw new DomainError("NOT_FOUND", "That offer no longer exists");
  if (offer.trigger !== "CODE") {
    throw new DomainError("VALIDATION_FAILED", "Switch the offer to “With a code” first");
  }

  const batch = `B${Date.now().toString(36).toUpperCase()}`;
  let made = 0;
  for (let attempt = 0; made < count && attempt < 10; attempt += 1) {
    const codes = new Set<string>();
    while (codes.size < count - made) codes.add(randomCode(prefix));
    const result = await prisma.promotionCode.createMany({
      data: [...codes].map((code) => ({ promotionId, code, usageLimit: usesEach, batch })),
      skipDuplicates: true,
    });
    made += result.count;
  }
  return batch;
}

export async function listCodeBatches(promotionId: string): Promise<CodeBatchSummary[]> {
  const rows = await prisma.promotionCode.findMany({
    where: { promotionId, batch: { not: null } },
    orderBy: [{ createdAt: "desc" }, { code: "asc" }],
    select: { code: true, usedCount: true, usageLimit: true, batch: true, createdAt: true },
  });
  const batches = new Map<string, CodeBatchSummary>();
  for (const row of rows) {
    const entry = batches.get(row.batch!) ?? {
      batch: row.batch!,
      createdAt: row.createdAt,
      total: 0,
      used: 0,
      usesEach: row.usageLimit,
      codes: [],
    };
    entry.total += 1;
    if (row.usedCount > 0) entry.used += 1;
    entry.codes.push({ code: row.code, usedCount: row.usedCount });
    batches.set(row.batch!, entry);
  }
  return [...batches.values()];
}

/** Removes the codes of a batch nobody has used yet; used ones are kept as history. */
export async function removeUnusedBatchCodes(promotionId: string, batch: string): Promise<number> {
  const result = await prisma.promotionCode.deleteMany({ where: { promotionId, batch, usedCount: 0 } });
  return result.count;
}
