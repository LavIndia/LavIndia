/**
 * The promotion engine — ONE pure function both sales channels call.
 *
 *   evaluatePromotions(lines, promotions, context) → Evaluation
 *
 * It reads no database and keeps no state, so the checkout, the counter and
 * the admin's "Test with a cart" panel all get exactly the same answer, and
 * the module can be lifted out as a product of its own.
 *
 * How offers play together:
 *   1. Piece offers first, then at most one order offer, then delivery.
 *   2. Each unit is used by one piece offer at most.
 *   3. Across classes, both offers must allow combining; otherwise the
 *      engine works out each way and keeps whichever saves the client more.
 *   4. An exclusive offer that applies wins outright, even against a better
 *      combination — that is what the admin asked for by switching it on.
 */
import {
  classOf,
  type EngineContext,
  type EngineLine,
  type EnginePromotion,
  type Evaluation,
} from "../contracts";
import { checkConditions, isAvailable } from "./eligibility";
import { buildScenario, type Scenario } from "./scenario";
import { preference, standaloneSavings } from "./search";
import { byPriceDesc, expandUnits } from "./units";
import { buildEvaluation } from "./result";

export function evaluatePromotions(
  lines: readonly EngineLine[],
  promotions: readonly EnginePromotion[],
  context: EngineContext,
): Evaluation {
  const allUnits = expandUnits(lines).sort(byPriceDesc);
  const freeUnits = allUnits.filter((unit) => !unit.line.locked);

  const available = promotions.filter((p) => isAvailable(p, context)).sort(preference);
  const qualified = available.filter((p) => checkConditions(p, lines, context).passes);
  const byId = new Map(available.map((p) => [p.id, p]));

  const pieces = qualified.filter((p) => classOf(p.benefit) === "PIECE");
  const orders = qualified.filter((p) => classOf(p.benefit) === "ORDER");
  const deliveries = qualified.filter((p) => classOf(p.benefit) === "DELIVERY");
  const standalone = standaloneSavings(pieces, freeUnits, context);

  const scenario = (
    pieceOffers: readonly EnginePromotion[],
    orderOffer: EnginePromotion | null,
    deliveryOffer: EnginePromotion | null,
  ) =>
    buildScenario({
      pieceOffers,
      orderOffer,
      deliveryOffer,
      freeUnits,
      allUnits,
      context,
      standalone,
      byId,
    });

  const better = (a: Scenario | null, b: Scenario) => (!a || b.saving > a.saving ? b : a);

  // An exclusive offer that applies at all wins outright.
  let winner: Scenario | null = null;
  let exclusiveWinner: EnginePromotion | null = null;
  for (const offer of qualified.filter((p) => p.exclusive)) {
    const cls = classOf(offer.benefit);
    const alone = scenario(
      cls === "PIECE" ? [offer] : [],
      cls === "ORDER" ? offer : null,
      cls === "DELIVERY" ? offer : null,
    );
    if (alone.saving > 0 && (!winner || alone.saving > winner.saving)) {
      winner = alone;
      exclusiveWinner = offer;
    }
  }

  if (!winner) {
    const open = (list: EnginePromotion[]) => list.filter((p) => !p.exclusive);
    const openPieces = open(pieces);
    for (const orderOffer of [null, ...open(orders)]) {
      // An order offer shares the cart only with piece offers that also
      // allow it, and only if it allows them.
      const allowedPieces = !orderOffer
        ? openPieces
        : orderOffer.combinesWithOtherClasses
          ? openPieces.filter((p) => p.combinesWithOtherClasses)
          : [];
      for (const deliveryOffer of [null, ...open(deliveries)]) {
        winner = better(winner, scenario(allowedPieces, orderOffer, deliveryOffer));
      }
    }
  }

  return buildEvaluation({
    winner: winner ?? scenario([], null, null),
    exclusiveWinner,
    lines,
    allUnits,
    freeUnits,
    available,
    qualified,
    standalone,
    context,
  });
}
