/**
 * Everything an admin does to an offer: create, edit, activate, pause,
 * resume, end, archive, duplicate, delete.
 *
 * Status is never set directly. Each action changes the facts status is
 * worked out from (activatedAt, isPaused, endsAt, archivedAt), so the list
 * screen, the engine and the reports can never disagree about it.
 */
import type { Prisma } from "@prisma/client";
import { prisma } from "../_shared/db";
import { DomainError } from "../_shared/errors";
import { toEnginePromotion, type PromotionRow } from "./mapping";
import { findActivePromotionRows, PROMOTION_INCLUDE, toEnginePromotions } from "./repository";
import { loadCatalogFacts } from "./read/catalog-facts";
import { promotionInputSchema, type PromotionInput } from "./schema";
import { validatePromotion, type ValidationResult } from "./validate";

export type LifecycleAction = "activate" | "pause" | "resume" | "end" | "archive" | "restore";

function toData(input: PromotionInput) {
  // The code lives in its own table; everything else is a column.
  const rest: Omit<PromotionInput, "code"> & { code?: unknown } = { ...input };
  delete rest.code;
  return {
    ...rest,
    pieces: rest.pieces as unknown as Prisma.InputJsonValue,
    conditions: rest.conditions as unknown as Prisma.InputJsonValue,
    benefit: rest.benefit as unknown as Prisma.InputJsonValue,
  };
}

/** What the editor loads: the saved offer in the shape it saves. */
export function toInput(row: PromotionRow): PromotionInput {
  return promotionInputSchema.parse({
    ...row,
    code: row.codes[0]?.code ?? null,
  });
}

async function assertCodeFree(code: string | null, selfId?: string) {
  if (!code) return;
  const taken = await prisma.promotionCode.findUnique({ where: { code }, select: { promotionId: true } });
  if (taken && taken.promotionId !== selfId) {
    throw new DomainError("CONFLICT", `The code ${code} is already used by another offer`);
  }
}

async function findRow(id: string): Promise<PromotionRow> {
  const row = await prisma.promotion.findUnique({ where: { id }, include: PROMOTION_INCLUDE });
  if (!row) throw new DomainError("NOT_FOUND", "That offer no longer exists");
  return row;
}

export async function checkPromotion(input: PromotionInput, selfId?: string): Promise<ValidationResult> {
  const [facts, rows] = await Promise.all([loadCatalogFacts(), findActivePromotionRows()]);
  return validatePromotion(input, facts.pieces, toEnginePromotions(rows), selfId);
}

export async function createPromotion(raw: unknown, actorId: string): Promise<PromotionRow> {
  const input = promotionInputSchema.parse(raw);
  await assertCodeFree(input.code);
  return prisma.promotion.create({
    data: {
      ...toData(input),
      createdById: actorId,
      codes: input.code ? { create: { code: input.code } } : undefined,
    },
    include: PROMOTION_INCLUDE,
  });
}

export async function updatePromotion(id: string, raw: unknown): Promise<PromotionRow> {
  const input = promotionInputSchema.parse(raw);
  const existing = await findRow(id);
  if (existing.archivedAt) throw new DomainError("CONFLICT", "Restore this offer before editing it");
  await assertCodeFree(input.code, id);

  return prisma.$transaction(async (tx) => {
    const current = existing.codes[0]?.code ?? null;
    if (current !== input.code) {
      await tx.promotionCode.deleteMany({ where: { promotionId: id } });
      if (input.code) await tx.promotionCode.create({ data: { promotionId: id, code: input.code } });
    }
    return tx.promotion.update({ where: { id }, data: toData(input), include: PROMOTION_INCLUDE });
  });
}

export async function changeLifecycle(id: string, action: LifecycleAction): Promise<PromotionRow> {
  const row = await findRow(id);
  const now = new Date();
  let data: Prisma.PromotionUpdateInput;

  switch (action) {
    case "activate": {
      // Activation is where an offer must be able to work as written.
      const result = await checkPromotion(toInput(row), id);
      if (result.errors.length) {
        throw new DomainError("VALIDATION_FAILED", result.errors[0], { errors: result.errors });
      }
      if (!toEnginePromotion(row)) throw new DomainError("VALIDATION_FAILED", "This offer's settings are incomplete");
      data = { activatedAt: row.activatedAt ?? now, isPaused: false, archivedAt: null };
      if (row.endsAt && row.endsAt <= now) data.endsAt = null;
      break;
    }
    case "pause":
      data = { isPaused: true };
      break;
    case "resume":
      data = { isPaused: false };
      break;
    case "end":
      data = { endsAt: now, isPaused: false };
      break;
    case "archive":
      data = { archivedAt: now };
      break;
    case "restore":
      data = { archivedAt: null };
      break;
  }
  return prisma.promotion.update({ where: { id }, data, include: PROMOTION_INCLUDE });
}

/** A copy as a new draft: same mechanics and words, no code, no history. */
export async function duplicatePromotion(id: string, actorId: string): Promise<PromotionRow> {
  const row = await findRow(id);
  const input = toInput(row);
  return prisma.promotion.create({
    data: {
      ...toData({ ...input, code: null, slug: null }),
      name: `${row.name} (copy)`,
      createdById: actorId,
    },
    include: PROMOTION_INCLUDE,
  });
}

/**
 * Only an offer nobody has used can be deleted. One with orders behind it is
 * archived instead, because reports and invoices refer to it.
 */
export async function deletePromotion(id: string): Promise<void> {
  const row = await findRow(id);
  const used = row.usedCount > 0 || (await prisma.promotionAllocation.count({ where: { promotionId: id } })) > 0;
  if (used) throw new DomainError("CONFLICT", "This offer has been used on orders — archive it instead");
  await prisma.promotion.delete({ where: { id } });
}

export async function listPromotions(): Promise<PromotionRow[]> {
  return prisma.promotion.findMany({ include: PROMOTION_INCLUDE, orderBy: { createdAt: "desc" } });
}

export async function getPromotion(id: string): Promise<PromotionRow> {
  return findRow(id);
}
