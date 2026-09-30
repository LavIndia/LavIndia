/**
 * From a stored Promotion row to what the engine and the screens use.
 */
import type { Promotion, PromotionCode } from "@prisma/client";
import type { Channel, EnginePromotion } from "./contracts";
import { benefitSchema, conditionSchema, pieceFilterSchema } from "./schema";
import { headline } from "./summarise";
import { z } from "zod";

export type PromotionRow = Promotion & { codes: Pick<PromotionCode, "code">[] };

export type PromotionStatus = "DRAFT" | "SCHEDULED" | "LIVE" | "PAUSED" | "ENDED" | "ARCHIVED";

/** Status is worked out, never stored, so it cannot drift from the truth. */
export function statusOf(
  row: Pick<
    Promotion,
    | "archivedAt"
    | "activatedAt"
    | "isPaused"
    | "startsAt"
    | "endsAt"
    | "usageLimit"
    | "usedCount"
    | "budgetCents"
    | "discountGivenCents"
  >,
  now: Date = new Date(),
): PromotionStatus {
  if (row.archivedAt) return "ARCHIVED";
  if (!row.activatedAt) return "DRAFT";
  if (row.isPaused) return "PAUSED";
  if (row.endsAt && now > row.endsAt) return "ENDED";
  if (row.usageLimit !== null && row.usedCount >= row.usageLimit) return "ENDED";
  if (row.budgetCents !== null && row.discountGivenCents >= row.budgetCents) return "ENDED";
  if (row.startsAt && now < row.startsAt) return "SCHEDULED";
  return "LIVE";
}

/** The client-facing name: the admin's title, else one worked out. */
export function labelOf(row: Pick<Promotion, "title" | "invoiceLabel" | "benefit">): string {
  if (row.title) return row.title;
  const parsed = benefitSchema.safeParse(row.benefit);
  return parsed.success ? headline(parsed.data) : "Offer";
}

/**
 * Returns null for a row whose stored mechanics no longer validate, so one
 * bad row takes itself out of the engine rather than breaking every cart.
 */
export function toEnginePromotion(row: PromotionRow): EnginePromotion | null {
  const benefit = benefitSchema.safeParse(row.benefit);
  const pieces = pieceFilterSchema.safeParse(row.pieces);
  const conditions = z.array(conditionSchema).safeParse(row.conditions);
  if (!benefit.success || !pieces.success || !conditions.success) {
    console.error(`Promotion ${row.id} has invalid mechanics and was skipped`);
    return null;
  }

  return {
    id: row.id,
    label: labelOf(row),
    invoiceLabel: row.invoiceLabel,
    trigger: row.trigger,
    codes: row.codes.map((c) => c.code.toUpperCase()),
    channels: row.channels as Channel[],
    schedule: {
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      isRecurring: row.isRecurring,
      recurrenceType: row.recurrenceType,
      recurrenceDaysOfWeek: row.recurrenceDaysOfWeek,
      recurrenceDayOfMonth: row.recurrenceDayOfMonth,
      recurrenceStartTime: row.recurrenceStartTime,
      recurrenceEndTime: row.recurrenceEndTime,
    },
    pieces: pieces.data,
    minQuantity: row.minQuantity,
    minSubtotalCents: row.minSubtotalCents,
    conditions: conditions.data,
    benefit: benefit.data,
    priceIncludesTax: row.priceIncludesTax,
    maxApplicationsPerOrder: row.maxApplicationsPerOrder,
    maxDiscountCents: row.maxDiscountCents,
    combinesWithOtherClasses: row.combinesWithOtherClasses,
    exclusive: row.exclusive,
    rank: row.rank,
    createdAt: row.createdAt,
  };
}

/** An unsaved draft as the engine sees it — for testing before saving. */
export function inputToEngine(
  input: import("./schema").PromotionInput,
  id = "draft",
): EnginePromotion {
  return {
    id,
    label: input.title || headline(input.benefit),
    invoiceLabel: input.invoiceLabel,
    trigger: input.trigger,
    codes: input.code ? [input.code] : [],
    channels: input.channels,
    schedule: {
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      isRecurring: input.isRecurring,
      recurrenceType: input.recurrenceType,
      recurrenceDaysOfWeek: input.recurrenceDaysOfWeek,
      recurrenceDayOfMonth: input.recurrenceDayOfMonth,
      recurrenceStartTime: input.recurrenceStartTime,
      recurrenceEndTime: input.recurrenceEndTime,
    },
    pieces: input.pieces,
    minQuantity: input.minQuantity,
    minSubtotalCents: input.minSubtotalCents,
    conditions: input.conditions,
    benefit: input.benefit,
    priceIncludesTax: input.priceIncludesTax,
    maxApplicationsPerOrder: input.maxApplicationsPerOrder,
    maxDiscountCents: input.maxDiscountCents,
    combinesWithOtherClasses: input.combinesWithOtherClasses,
    exclusive: input.exclusive,
    rank: input.rank,
    createdAt: new Date(),
  };
}
