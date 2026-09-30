/**
 * One way the offers could land on this cart: a set of piece offers, at most
 * one order offer, and at most one delivery offer. The evaluator builds a few
 * of these and keeps the one where the client pays least.
 */
import type { EngineContext, EnginePromotion } from "../contracts";
import { bestPieceAssignment, type PieceAssignment } from "./search";
import { applyOrderOffer, deliverySaving, type OrderOutcome, type PricedUnit } from "./order-benefits";
import { allocateProportionally } from "./allocate";
import type { Unit } from "./units";

export interface Scenario {
  piece: PieceAssignment;
  order: { promotion: EnginePromotion; outcome: OrderOutcome } | null;
  delivery: { promotion: EnginePromotion; cents: number } | null;
  /** Everything the client saves, delivery included. */
  saving: number;
  /** Piece discount per unit key, after spreading each application. */
  pieceByUnit: Map<string, Array<{ promotion: EnginePromotion; key: string; cents: number }>>;
}

/** Spreads each application's discount over its own units by list price. */
function spreadPieceDiscounts(
  assignment: PieceAssignment,
  promotions: ReadonlyMap<string, EnginePromotion>,
): Scenario["pieceByUnit"] {
  const byUnit: Scenario["pieceByUnit"] = new Map();
  for (const [promotionId, applications] of assignment.byPromotion) {
    const promotion = promotions.get(promotionId)!;
    for (const application of applications) {
      const shares = allocateProportionally(
        application.discountCents,
        application.units.map((unit) => ({ weight: unit.listCents, priority: unit.listCents })),
      );
      application.units.forEach((unit, index) => {
        if (shares[index] <= 0) return;
        const list = byUnit.get(unit.key) ?? [];
        list.push({ promotion, key: application.key, cents: shares[index] });
        byUnit.set(unit.key, list);
      });
    }
  }
  return byUnit;
}

export function priceAfterPieces(
  units: readonly Unit[],
  pieceByUnit: Scenario["pieceByUnit"],
): PricedUnit[] {
  return units.map((unit) => ({
    unit,
    netCents:
      unit.listCents - (pieceByUnit.get(unit.key) ?? []).reduce((sum, a) => sum + a.cents, 0),
  }));
}

export function buildScenario(args: {
  pieceOffers: readonly EnginePromotion[];
  orderOffer: EnginePromotion | null;
  deliveryOffer: EnginePromotion | null;
  freeUnits: readonly Unit[];
  allUnits: readonly Unit[];
  context: EngineContext;
  standalone: Map<string, number>;
  byId: ReadonlyMap<string, EnginePromotion>;
}): Scenario {
  const { orderOffer, deliveryOffer, context } = args;

  const piece = bestPieceAssignment(args.pieceOffers, args.freeUnits, context, args.standalone);
  const pieceByUnit = spreadPieceDiscounts(piece, args.byId);
  const priced = priceAfterPieces(args.allUnits, pieceByUnit);

  let order: Scenario["order"] = null;
  if (orderOffer) {
    const outcome = applyOrderOffer(orderOffer, priced);
    if (outcome.totalCents > 0) order = { promotion: orderOffer, outcome };
  }

  let delivery: Scenario["delivery"] = null;
  if (deliveryOffer && context.shippingCents > 0) {
    const applied = [
      ...[...piece.byPromotion.keys()].map((id) => args.byId.get(id)!),
      ...(order ? [order.promotion] : []),
    ];
    const combines =
      applied.length === 0 ||
      (deliveryOffer.combinesWithOtherClasses && applied.every((p) => p.combinesWithOtherClasses));
    const { cents } = deliverySaving(deliveryOffer, priced, context.shippingCents);
    if (combines && cents > 0) delivery = { promotion: deliveryOffer, cents };
  }

  const saving = piece.saving + (order?.outcome.totalCents ?? 0) + (delivery?.cents ?? 0);
  return { piece, order, delivery, saving, pieceByUnit };
}
