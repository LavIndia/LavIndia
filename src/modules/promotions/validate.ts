/**
 * Checks an offer before it goes live, in the admin's words.
 *
 * Errors block activation — the offer cannot work as written. Warnings are
 * things the admin should know and may accept: pieces that could sell below
 * cost, overlap with offers already live, no end date.
 */
import { classOf, type Benefit, type EnginePromotion } from "./contracts";
import { matchesFilter } from "./engine/units";
import { pieceAsLine, type PieceFact } from "./read/catalog-facts";
import type { PromotionInput } from "./schema";
import { resolvePieces, type SetLibrary } from "./piece-sets";
import { rupees } from "./summarise";

export interface ValidationResult {
  errors: string[];
  warnings: string[];
  /** Pieces the offer can apply to on its channels. */
  matchCount: number;
  noCostCount: number;
}

/** Worst-case share of list price the client pays, per benefit. */
function worstNetRatio(benefit: Benefit, prices: number[]): number | null {
  const sorted = [...prices].sort((a, b) => b - a);
  const sumTop = (n: number) => sorted.slice(0, n).reduce((s, p) => s + p, 0);
  switch (benefit.type) {
    case "percentOff":
    case "percentOffOrder":
      return 1 - benefit.bps / 10_000;
    case "setPrice":
      return sorted.length >= benefit.setSize ? benefit.priceCents / sumTop(benefit.setSize) : null;
    case "setPriceTiers":
      return Math.min(
        ...benefit.tiers
          .filter((t) => sorted.length >= t.size)
          .map((t) => t.priceCents / sumTop(t.size)),
        1,
      );
    case "reward":
      return benefit.value.type === "percent"
        ? 1 - (benefit.getQuantity * benefit.value.bps) / 10_000 / (benefit.buyQuantity + benefit.getQuantity)
        : null;
    case "percentTiers":
      return 1 - Math.max(...benefit.tiers.map((t) => t.bps)) / 10_000;
    default:
      return null;
  }
}

function tierErrors(benefit: Benefit): string[] {
  const errors: string[] = [];
  if (benefit.type === "setPriceTiers") {
    const tiers = [...benefit.tiers].sort((a, b) => a.size - b.size);
    for (let i = 1; i < tiers.length; i += 1) {
      if (tiers[i].size === tiers[i - 1].size) errors.push(`Two tiers are both for ${tiers[i].size} pieces`);
      const before = tiers[i - 1].priceCents / tiers[i - 1].size;
      const now = tiers[i].priceCents / tiers[i].size;
      if (now >= before) {
        errors.push(
          `Buying ${tiers[i].size} should cost less per piece than buying ${tiers[i - 1].size} (${rupees(Math.round(now))} vs ${rupees(Math.round(before))})`,
        );
      }
    }
  }
  if (benefit.type === "percentTiers" || benefit.type === "orderTiers") {
    const values =
      benefit.type === "percentTiers"
        ? [...benefit.tiers].sort((a, b) => a.min - b.min).map((t) => t.bps)
        : [...benefit.tiers]
            .sort((a, b) => a.minSubtotalCents - b.minSubtotalCents)
            .map((t) => t.amountOffCents ?? t.bps ?? 0);
    if (values.some((v, i) => i > 0 && v <= values[i - 1])) {
      errors.push("Each higher tier should give more than the one before it");
    }
  }
  if (benefit.type === "orderTiers" && benefit.tiers.some((t) => t.amountOffCents == null && t.bps == null)) {
    errors.push("Every spend tier needs an amount or a percentage off");
  }
  return errors;
}

export function validatePromotion(
  input: PromotionInput,
  pieces: readonly PieceFact[],
  livePromotions: readonly EnginePromotion[],
  selfId?: string,
  library?: SetLibrary,
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  // Sets are checked as they stand now; one that no longer exists is named.
  if (library) {
    const missing = [
      ...(input.pieces.setIds ?? []),
      ...(input.benefit.type === "reward" ? (input.benefit.gets?.setIds ?? []) : []),
      ...(input.benefit.type === "bundle" ? input.benefit.components.flatMap((c) => c.pieces.setIds ?? []) : []),
    ].filter((id) => !library.has(id));
    if (missing.length) errors.push("A piece set this offer uses has been archived or deleted — choose another");
    input = {
      ...input,
      pieces: resolvePieces(input.pieces, library),
      benefit:
        input.benefit.type === "reward" && input.benefit.gets
          ? { ...input.benefit, gets: resolvePieces(input.benefit.gets, library) }
          : input.benefit.type === "bundle"
            ? { ...input.benefit, components: input.benefit.components.map((c) => ({ ...c, pieces: resolvePieces(c.pieces, library) })) }
            : input.benefit,
    };
  }
  const benefit = input.benefit;
  const cls = classOf(benefit);

  if (input.trigger === "CODE" && !input.code) errors.push("Give the offer a code, or make it automatic");
  if (input.startsAt && input.endsAt && input.endsAt <= input.startsAt) {
    errors.push("The end is before the start");
  }
  if (input.isRecurring) {
    if (input.recurrenceType === "WEEKLY" && input.recurrenceDaysOfWeek.length === 0) {
      errors.push("Pick at least one day for a weekly schedule");
    }
    if (input.recurrenceType === "MONTHLY" && !input.recurrenceDayOfMonth) {
      errors.push("Pick the day of the month");
    }
    if (Boolean(input.recurrenceStartTime) !== Boolean(input.recurrenceEndTime)) {
      errors.push("Give both a start time and an end time, or neither");
    }
  }
  errors.push(...tierErrors(benefit));

  const onChannel = pieces.filter(
    (p) =>
      (input.channels.includes("ONLINE") && p.onlineSellable) ||
      (input.channels.includes("STORE") && p.storeSellable),
  );
  const matching = onChannel.filter((p) => matchesFilter(pieceAsLine(p), input.pieces));
  const noCostCount = matching.filter((p) => p.costCents === null).length;

  if (cls === "PIECE" && benefit.type !== "bundle" && matching.length === 0) {
    errors.push("No sellable pieces match this selection");
  }
  if (benefit.type === "bundle") {
    benefit.components.forEach((component, index) => {
      if (!onChannel.some((p) => matchesFilter(pieceAsLine(p), component.pieces))) {
        errors.push(`Part ${index + 1} of the set matches no sellable pieces`);
      }
    });
  }
  if (benefit.type === "reward" && benefit.gets) {
    if (!onChannel.some((p) => matchesFilter(pieceAsLine(p), benefit.gets!))) {
      errors.push("No sellable pieces match what the client gets");
    }
  }

  const prices = matching.map((p) => p.priceCents);
  if (benefit.type === "setPrice" && prices.length >= benefit.setSize) {
    const sorted = [...prices].sort((a, b) => b - a);
    const dearest = sorted.slice(0, benefit.setSize).reduce((s, p) => s + p, 0);
    const cheapest = sorted.slice(-benefit.setSize).reduce((s, p) => s + p, 0);
    if (benefit.priceCents >= dearest) {
      errors.push(`${rupees(benefit.priceCents)} is more than any ${benefit.setSize} of these pieces cost, so it never saves anything`);
    } else if (benefit.priceCents >= cheapest) {
      warnings.push(`Sets of the lower-priced pieces already cost less than ${rupees(benefit.priceCents)}; the offer will not apply to them`);
    }
  }

  const ratio = worstNetRatio(benefit, prices);
  if (ratio !== null) {
    const below = matching.filter((p) => p.costCents !== null && p.priceCents * ratio < p.costCents);
    if (below.length) {
      const worst = below.reduce((a, b) =>
        a.priceCents * ratio - a.costCents! < b.priceCents * ratio - b.costCents! ? a : b,
      );
      warnings.push(
        `${below.length} piece${below.length === 1 ? "" : "s"} could sell below cost — lowest is ${worst.productName} at ${rupees(Math.round(worst.priceCents * ratio))} against a cost of ${rupees(worst.costCents!)}`,
      );
    }
    if (ratio < 0.5) warnings.push(`Clients could get more than half off (${Math.round((1 - ratio) * 100)}%)`);
  }
  if (noCostCount > 0) warnings.push(`${noCostCount} matching piece${noCostCount === 1 ? " has" : "s have"} no cost entered, so margin can't be checked`);
  if (!input.endsAt) warnings.push("No end date — it runs until you end it");
  if (input.exclusive && input.combinesWithOtherClasses) warnings.push("Exclusive offers never combine; the combine setting is ignored");

  const overlapping = livePromotions.filter(
    (p) =>
      p.id !== selfId &&
      classOf(p.benefit) === cls &&
      p.channels.some((c) => input.channels.includes(c)) &&
      matching.some((piece) => matchesFilter(pieceAsLine(piece), p.pieces)),
  );
  for (const other of overlapping) {
    warnings.push(`Overlaps "${other.label}" on some pieces — the client gets whichever saves more`);
  }
  const automaticLive = livePromotions.filter((p) => p.trigger === "AUTOMATIC").length;
  if (automaticLive >= 20) warnings.push(`${automaticLive} automatic offers are already live`);

  return { errors, warnings, matchCount: matching.length, noCostCount };
}
