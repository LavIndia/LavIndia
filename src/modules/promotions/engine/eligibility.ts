/**
 * Whether an offer may be considered for this cart at all — before anything
 * is priced. Channel, schedule, code and the order-level conditions.
 */
import { isScheduledActive } from "@/lib/scheduling";
import type { Condition, EngineContext, EngineLine, EnginePromotion } from "../contracts";

export function isLive(promotion: EnginePromotion, now: Date): boolean {
  const s = promotion.schedule;
  return isScheduledActive(
    {
      isActive: true,
      startDate: s.startsAt,
      endDate: s.endsAt,
      isRecurring: s.isRecurring,
      recurrenceType: s.recurrenceType,
      recurrenceDaysOfWeek: s.recurrenceDaysOfWeek,
      recurrenceDayOfMonth: s.recurrenceDayOfMonth,
      recurrenceStartTime: s.recurrenceStartTime,
      recurrenceEndTime: s.recurrenceEndTime,
    },
    now,
  );
}

/** The entered code that unlocks this offer, or null. */
export function matchingCode(promotion: EnginePromotion, context: EngineContext): string | null {
  const entered = new Set(context.codes.map((code) => code.trim().toUpperCase()));
  return promotion.codes.find((code) => entered.has(code)) ?? null;
}

export interface ConditionCheck {
  passes: boolean;
  /** What would make it pass, when that is something the client can do. */
  remainingCents?: number;
  remainingQuantity?: number;
}

function checkCondition(
  condition: Condition,
  lines: readonly EngineLine[],
  context: EngineContext,
): ConditionCheck {
  switch (condition.type) {
    case "minOrderSubtotal": {
      const subtotal = lines.reduce((sum, l) => sum + l.unitPriceCents * l.quantity, 0);
      return subtotal >= condition.cents
        ? { passes: true }
        : { passes: false, remainingCents: condition.cents - subtotal };
    }
    case "minOrderQuantity": {
      const quantity = lines.reduce((sum, l) => sum + l.quantity, 0);
      return quantity >= condition.quantity
        ? { passes: true }
        : { passes: false, remainingQuantity: condition.quantity - quantity };
    }
    case "signedInOnly":
      return { passes: context.customer.id !== null };
    case "firstOrderOnly":
      return { passes: context.customer.id !== null && context.customer.previousOrderCount === 0 };
    case "customers":
      return {
        passes: context.customer.id !== null && condition.customerIds.includes(context.customer.id),
      };
    case "paymentMethods":
      return {
        passes: context.paymentMethod !== null && condition.methods.includes(context.paymentMethod),
      };
  }
}

export function checkConditions(
  promotion: EnginePromotion,
  lines: readonly EngineLine[],
  context: EngineContext,
): ConditionCheck {
  let remainingCents = 0;
  let remainingQuantity = 0;
  for (const condition of promotion.conditions) {
    const result = checkCondition(condition, lines, context);
    if (result.passes) continue;
    // Only shortfalls the client can close by adding to the cart are
    // reported; failing any other condition rules the offer out outright.
    if (result.remainingCents === undefined && result.remainingQuantity === undefined) {
      return { passes: false };
    }
    remainingCents = Math.max(remainingCents, result.remainingCents ?? 0);
    remainingQuantity = Math.max(remainingQuantity, result.remainingQuantity ?? 0);
  }
  if (remainingCents === 0 && remainingQuantity === 0) return { passes: true };
  return {
    passes: false,
    remainingCents: remainingCents || undefined,
    remainingQuantity: remainingQuantity || undefined,
  };
}

/** Channel, schedule and code — the things no cart change can fix. */
export function isAvailable(promotion: EnginePromotion, context: EngineContext): boolean {
  if (!promotion.channels.includes(context.channel)) return false;
  if (!isLive(promotion, context.now)) return false;
  if (promotion.trigger === "CODE" && !matchingCode(promotion, context)) return false;
  return true;
}
