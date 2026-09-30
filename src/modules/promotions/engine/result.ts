/**
 * Turns the winning scenario into the answer: what each unit is discounted
 * and by which offer, what applied, what did not and why, and what the client
 * is short of.
 */
import {
  classOf,
  type AppliedPromotion,
  type EngineContext,
  type EngineLine,
  type EnginePromotion,
  type EngineUnit,
  type Evaluation,
  type Nudge,
  type RejectedPromotion,
} from "../contracts";
import { checkConditions, matchingCode } from "./eligibility";
import { shortfallFor } from "./nudges";
import { applyOrderOffer, deliverySaving } from "./order-benefits";
import { priceAfterPieces, type Scenario } from "./scenario";
import { matchesFilter, type Unit } from "./units";

interface ResultInput {
  winner: Scenario;
  exclusiveWinner: EnginePromotion | null;
  lines: readonly EngineLine[];
  allUnits: readonly Unit[];
  freeUnits: readonly Unit[];
  available: readonly EnginePromotion[];
  qualified: readonly EnginePromotion[];
  standalone: Map<string, number>;
  context: EngineContext;
}

function appliedList(input: ResultInput): AppliedPromotion[] {
  const { winner, context } = input;
  const byId = new Map(input.available.map((p) => [p.id, p]));
  const applied: AppliedPromotion[] = [];

  for (const [id, applications] of winner.piece.byPromotion) {
    const promotion = byId.get(id)!;
    applied.push({
      promotionId: id,
      label: promotion.label,
      class: "PIECE",
      code: matchingCode(promotion, context),
      savingCents: applications.reduce((sum, a) => sum + a.discountCents, 0),
      applications: applications.length,
    });
  }
  if (winner.order) {
    applied.push({
      promotionId: winner.order.promotion.id,
      label: winner.order.promotion.label,
      class: "ORDER",
      code: matchingCode(winner.order.promotion, context),
      savingCents: winner.order.outcome.totalCents,
      applications: 1,
    });
  }
  if (winner.delivery) {
    applied.push({
      promotionId: winner.delivery.promotion.id,
      label: winner.delivery.promotion.label,
      class: "DELIVERY",
      code: matchingCode(winner.delivery.promotion, context),
      savingCents: winner.delivery.cents,
      applications: 1,
    });
  }
  return applied;
}

function unitResults(input: ResultInput): EngineUnit[] {
  const { winner, context } = input;
  const orderShare = new Map<string, number>();
  if (winner.order) {
    winner.order.outcome.eligible.forEach((entry, index) => {
      orderShare.set(entry.unit.key, winner.order!.outcome.shares[index]);
    });
  }

  const inCartOrder = [...input.allUnits].sort(
    (a, b) => a.lineOrder - b.lineOrder || a.index - b.index,
  );
  return inCartOrder.map((unit) => {
    const allocations = (winner.pieceByUnit.get(unit.key) ?? []).map((entry) => ({
      promotionId: entry.promotion.id,
      label: entry.promotion.label,
      code: matchingCode(entry.promotion, context),
      applicationKey: entry.key,
      cents: entry.cents,
    }));
    const share = orderShare.get(unit.key) ?? 0;
    if (share > 0 && winner.order) {
      allocations.push({
        promotionId: winner.order.promotion.id,
        label: winner.order.promotion.label,
        code: matchingCode(winner.order.promotion, context),
        applicationKey: "order",
        cents: share,
      });
    }
    return {
      lineId: unit.lineId,
      index: unit.index,
      listCents: unit.listCents,
      discountCents: allocations.reduce((sum, a) => sum + a.cents, 0),
      allocations,
    };
  });
}

/** What an offer would save on this cart if it were the only one. */
function aloneSaving(promotion: EnginePromotion, input: ResultInput): number {
  const cls = classOf(promotion.benefit);
  const atList = priceAfterPieces(input.allUnits, new Map());
  if (cls === "PIECE") return input.standalone.get(promotion.id) ?? 0;
  if (cls === "ORDER") return applyOrderOffer(promotion, atList).totalCents;
  return deliverySaving(promotion, atList, input.context.shippingCents).cents;
}

function rejections(input: ResultInput, applied: AppliedPromotion[]): RejectedPromotion[] {
  const appliedIds = new Set(applied.map((a) => a.promotionId));
  const appliedClasses = new Set(applied.map((a) => a.class));
  const byId = new Map(input.available.map((p) => [p.id, p]));
  const qualified = new Set(input.qualified.map((p) => p.id));

  return input.available
    .filter((p) => !appliedIds.has(p.id))
    .map((p): RejectedPromotion => {
      const base = { promotionId: p.id, label: p.label };
      if (!qualified.has(p.id)) return { ...base, reason: "NOT_QUALIFIED" };
      const alone = aloneSaving(p, input);
      if (alone <= 0) return { ...base, reason: "NOT_QUALIFIED" };
      if (input.exclusiveWinner) return { ...base, reason: "EXCLUSIVE_ELSEWHERE" };

      const cls = classOf(p.benefit);
      const otherClassApplied = [...appliedClasses].some((c) => c !== cls);
      const blockers = applied.filter((a) => a.class !== cls).map((a) => byId.get(a.promotionId)!);
      if (
        otherClassApplied &&
        (!p.combinesWithOtherClasses || blockers.some((b) => !b.combinesWithOtherClasses))
      ) {
        return { ...base, reason: "NOT_COMBINABLE" };
      }
      return {
        ...base,
        reason: "SAVES_LESS",
        shortfallCents: Math.max(0, input.winner.saving - alone),
      };
    });
}

function nudges(input: ResultInput): Nudge[] {
  const result: Nudge[] = [];
  const atList = priceAfterPieces(input.allUnits, new Map());

  for (const promotion of input.available) {
    const base = { promotionId: promotion.id, label: promotion.label };
    const conditions = checkConditions(promotion, input.lines, input.context);
    const touches = input.freeUnits.some((u) => matchesFilter(u.line, promotion.pieces));

    if (!conditions.passes) {
      if ((conditions.remainingCents || conditions.remainingQuantity) && touches) {
        result.push({
          ...base,
          remainingCents: conditions.remainingCents,
          remainingQuantity: conditions.remainingQuantity,
        });
      }
      continue;
    }

    const cls = classOf(promotion.benefit);
    if (cls === "PIECE") {
      if (!touches) continue;
      const shortfall = shortfallFor(promotion, input.freeUnits);
      if (shortfall) result.push({ ...base, ...shortfall });
    } else {
      const remainingCents =
        cls === "ORDER"
          ? applyOrderOffer(promotion, atList).remainingCents
          : deliverySaving(promotion, atList, input.context.shippingCents).remainingCents;
      if (remainingCents && input.allUnits.length > 0) result.push({ ...base, remainingCents });
    }
  }
  return result;
}

export function buildEvaluation(input: ResultInput): Evaluation {
  const applied = appliedList(input);
  const units = unitResults(input);
  const usedCodes = new Set(applied.map((a) => a.code).filter(Boolean));
  const entered = [...new Set(input.context.codes.map((c) => c.trim().toUpperCase()))].filter(
    Boolean,
  );

  const pieceDiscountCents = input.winner.piece.saving;
  const orderDiscountCents = input.winner.order?.outcome.totalCents ?? 0;
  return {
    units,
    applied,
    rejected: rejections(input, applied),
    nudges: nudges(input),
    unusedCodes: entered.filter((code) => !usedCodes.has(code)),
    listSubtotalCents: input.allUnits.reduce((sum, u) => sum + u.listCents, 0),
    pieceDiscountCents,
    orderDiscountCents,
    deliveryDiscountCents: input.winner.delivery?.cents ?? 0,
  };
}
