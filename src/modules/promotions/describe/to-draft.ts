/**
 * Claude's reading of a described offer → changes to an editor draft.
 *
 * The result is only ever a starting point shown in the editor: nothing is
 * saved. Every value that had to be guessed, clamped or left out is added to
 * the notes the admin sees above the form.
 */
import type { Benefit, Condition, RewardValue } from "../contracts";
import type { PromotionInput } from "../schema";
import type { DescribedBenefit, DescribedOffer } from "./output-schema";
import { paise, toPieceFilter, type DescribeVocabulary } from "./resolve-pieces";
import { SetProposals, type ProposedSet } from "./to-chooser";

/** The fields the description sets; the chosen template supplies the rest. */
export type DescribedPatch = Partial<Omit<PromotionInput, "startsAt" | "endsAt">> & {
  startsAt?: string;
  endsAt?: string;
};

export interface DescribedResult {
  template: string;
  patch: DescribedPatch;
  /** Piece Sets the offer needs that don't exist yet; created from the editor. */
  proposedSets: ProposedSet[];
  notes: string[];
}

const bpsOf = (percent: number) => Math.min(10_000, Math.max(1, Math.round(percent * 100)));
const whole = (n: number | null | undefined, min = 1): number | null =>
  n == null || !Number.isFinite(n) || Math.round(n) < min ? null : Math.round(n);
const moneyOrNull = (rupees: number | null) => (rupees != null && rupees > 0 ? paise(rupees) : null);

/** A value the description should have given; a placeholder and a note when it didn't. */
function need(value: number | null, fallback: number, what: string, notes: string[]): number {
  if (value != null && value > 0) return value;
  notes.push(`${what} wasn't clear, so ${fallback} was put in — check it.`);
  return fallback;
}

function rewardValue(b: DescribedBenefit, notes: string[]): RewardValue {
  switch (b.rewardKind) {
    case "percentOff":
      return { type: "percent", bps: bpsOf(need(b.rewardAmount, 50, "The % off the reward", notes)) };
    case "rupeesOff":
      return { type: "amountOff", cents: paise(need(b.rewardAmount, 100, "The ₹ off the reward", notes)) };
    case "fixedPrice":
      return { type: "fixedPrice", cents: paise(b.rewardAmount ?? 0) };
    default:
      return { type: "percent", bps: 10_000 };
  }
}

function toBenefit(b: DescribedBenefit, vocab: DescribeVocabulary, notes: string[], proposals: SetProposals): Benefit {
  switch (b.type) {
    case "percentOff":
    case "percentOffOrder":
      return { type: b.type, bps: bpsOf(need(b.percent, 10, "The % off", notes)) };
    case "amountOffEach":
    case "amountOffOrder":
      return { type: b.type, cents: paise(need(b.rupees, 100, "The ₹ amount off", notes)) };
    case "fixedPriceEach":
      return { type: b.type, cents: paise(need(b.rupees, 499, "The price", notes)) };
    case "setPrice":
      return {
        type: "setPrice",
        setSize: whole(need(b.setSize, 3, "How many pieces make the set", notes)) ?? 3,
        priceCents: paise(need(b.rupees, 999, "The price of the set", notes)),
      };
    case "setPriceTiers": {
      const tiers = (b.tiers ?? [])
        .map((t) => ({ size: whole(t.threshold, 2), priceCents: moneyOrNull(t.rupees) }))
        .filter((t): t is { size: number; priceCents: number } => t.size !== null && t.priceCents !== null);
      if (!tiers.length) notes.push("The set prices weren't clear — add the steps in “What the client gets”.");
      return { type: "setPriceTiers", tiers: tiers.length ? tiers : [{ size: 2, priceCents: 69_900 }], leftovers: b.leftovers ?? "NEW_SET" };
    }
    case "percentTiers": {
      const basis = b.tierBasis ?? "QUANTITY";
      const tiers = (b.tiers ?? [])
        .map((t) => ({ min: basis === "SUBTOTAL" ? moneyOrNull(t.threshold) : whole(t.threshold), bps: t.percent ? bpsOf(t.percent) : null }))
        .filter((t): t is { min: number; bps: number } => t.min !== null && t.bps !== null);
      if (!tiers.length) notes.push("The steps weren't clear — add them in “What the client gets”.");
      return { type: "percentTiers", basis, tiers: tiers.length ? tiers : [{ min: 2, bps: 1_000 }] };
    }
    case "orderTiers": {
      const tiers = (b.tiers ?? [])
        .map((t) => ({
          minSubtotalCents: moneyOrNull(t.threshold),
          amountOffCents: moneyOrNull(t.rupees),
          bps: t.rupees ? null : t.percent ? bpsOf(t.percent) : null,
        }))
        .filter((t): t is { minSubtotalCents: number; amountOffCents: number | null; bps: number | null } =>
          t.minSubtotalCents !== null && (t.amountOffCents !== null || t.bps !== null));
      if (!tiers.length) notes.push("The spend steps weren't clear — add them in “What the client gets”.");
      return { type: "orderTiers", tiers: tiers.length ? tiers : [{ minSubtotalCents: 5_00_000, amountOffCents: 50_000 }] };
    }
    case "reward": {
      const gets = b.rewardPieces ? toPieceFilter(b.rewardPieces, vocab, notes, "reward pieces", proposals) : null;
      if (gets?.unmatched) notes.push("The reward pieces couldn't be found — choose them under “What the client gets”.");
      return {
        type: "reward",
        buyQuantity: whole(b.buyQuantity, 0) ?? 1,
        getQuantity: whole(b.getQuantity) ?? 1,
        gets: gets ? gets.filter : null,
        value: rewardValue(b, notes),
        pick: b.pick ?? "CHEAPEST",
      };
    }
    case "bundle": {
      const components = (b.components ?? []).map((c, i) => {
        const part = toPieceFilter(c.pieces, vocab, notes, `bundle part ${i + 1}`, proposals);
        if (part.unmatched) notes.push(`Bundle part ${i + 1} couldn't be found — choose its pieces.`);
        return { pieces: part.filter, quantity: whole(c.quantity) ?? 1 };
      });
      while (components.length < 2) components.push({ pieces: { include: [], exclude: [] }, quantity: 1 });
      if ((b.components ?? []).length < 2) notes.push("A bundle needs two parts — check both under “What the client gets”.");
      return { type: "bundle", components, priceCents: paise(need(b.rupees, 1499, "The bundle price", notes)) };
    }
    case "freeDelivery":
      return { type: "freeDelivery" };
  }
}

/** The gallery template whose name best fits, so the editor's heading reads right. */
function templateFor(offer: DescribedOffer, benefit: Benefit): string {
  switch (benefit.type) {
    case "setPrice": return "ANY_N_FOR_X";
    case "setPriceTiers": return "TIERED_SET_PRICE";
    case "bundle": return "BUNDLE";
    case "reward":
      if (benefit.gets) return "BUY_THIS_GET_THAT";
      return benefit.buyQuantity === 1 && benefit.getQuantity === 1 && benefit.value.type === "percent" && benefit.value.bps === 10_000 ? "BOGO" : "BUY_X_GET_Y";
    case "percentOff": return offer.recurrence ? "HAPPY_HOUR" : "PERCENT_OFF";
    case "amountOffEach": return "AMOUNT_OFF_EACH";
    case "fixedPriceEach": return "FIXED_PRICE_EACH";
    case "percentTiers": return "PERCENT_TIERS";
    case "orderTiers": return "ORDER_TIERS";
    case "freeDelivery": return "FREE_DELIVERY";
    case "amountOffOrder":
    case "percentOffOrder":
      if (offer.firstOrderOnly) return "FIRST_ORDER";
      return offer.trigger === "CODE" ? "COUPON" : "SPEND_AND_SAVE";
  }
}

const LOCAL_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

function dateField(value: string | null, what: string, notes: string[]): string | undefined {
  if (value == null) return undefined;
  if (LOCAL_DATETIME.test(value) && !Number.isNaN(new Date(value).getTime())) return value;
  notes.push(`The ${what} “${value}” couldn't be read — set it under “When”.`);
  return undefined;
}

function scheduleOf(offer: DescribedOffer, notes: string[]): DescribedPatch {
  const patch: DescribedPatch = {};
  const startsAt = dateField(offer.startsAt, "start", notes);
  const endsAt = dateField(offer.endsAt, "end", notes);
  if (startsAt) patch.startsAt = startsAt;
  patch.endsAt = endsAt ?? "";
  const r = offer.recurrence;
  if (!r) return { ...patch, isRecurring: false, recurrenceType: null };
  const time = (t: string | null) => (t && HHMM.test(t) ? t : null);
  return {
    ...patch,
    isRecurring: true,
    recurrenceType: r.type,
    recurrenceDaysOfWeek: [...new Set(r.daysOfWeek.map(Math.round).filter((d) => d >= 0 && d <= 6))],
    recurrenceDayOfMonth: r.type === "MONTHLY" ? (whole(r.dayOfMonth) ?? 1) : null,
    recurrenceStartTime: time(r.startTime),
    recurrenceEndTime: time(r.endTime),
  };
}

export function toDescribedResult(offer: DescribedOffer, vocab: DescribeVocabulary, text: string): DescribedResult {
  const notes: string[] = [];
  const proposals = new SetProposals();
  const pieces = toPieceFilter(offer.pieces, vocab, notes, "pieces", proposals);
  if (pieces.unmatched) notes.unshift("None of the pieces described could be found, so the offer covers every piece for now — choose the pieces in step 2.");
  const benefit = toBenefit(offer.benefit, vocab, notes, proposals);

  let channels = [...new Set(offer.channels)];
  if (benefit.type === "freeDelivery" && channels.includes("STORE")) {
    channels = ["ONLINE"];
    notes.push("Free delivery only applies to website orders, so the counter was left out.");
  }
  if (!channels.length) channels = ["ONLINE", "STORE"];

  let code: string | null = null;
  if (offer.trigger === "CODE") {
    code = (offer.code ?? "").replace(/[^A-Za-z0-9_-]/g, "").toUpperCase().slice(0, 40) || null;
    if (!code) notes.push("No code was given — type one in step 1, or press Suggest code.");
  }

  const conditions: Condition[] = [];
  if (offer.signedInOnly) conditions.push({ type: "signedInOnly" });
  if (offer.firstOrderOnly) conditions.push({ type: "firstOrderOnly" });
  if (offer.paymentMethods.length) conditions.push({ type: "paymentMethods", methods: [...new Set(offer.paymentMethods)] });

  let badge = offer.badge?.trim() || null;
  if (badge && badge.length > 40) badge = badge.slice(0, 40).trim();

  const patch: DescribedPatch = {
    name: (offer.name.trim() || "Described offer").slice(0, 120),
    description: `Described as: ${text}`.slice(0, 1000),
    trigger: offer.trigger,
    code,
    channels,
    pieces: pieces.filter,
    benefit,
    conditions,
    minSubtotalCents: moneyOrNull(offer.minOrderRupees),
    minQuantity: whole(offer.minPieces),
    maxApplicationsPerOrder: whole(offer.maxTimesPerOrder),
    perCustomerLimit: whole(offer.perClientLimit),
    usageLimit: whole(offer.totalUses),
    maxDiscountCents: moneyOrNull(offer.maxDiscountRupees),
    budgetCents: moneyOrNull(offer.budgetRupees),
    exclusive: offer.exclusive,
    badge,
    ...scheduleOf(offer, notes),
  };
  if (proposals.list.length) {
    notes.unshift(
      proposals.list.length === 1
        ? "Some pieces need a new Piece Set. It is marked “Not created yet” in the editor — press Create set, check the pieces it shows, and save it."
        : `Some pieces need ${proposals.list.length} new Piece Sets. Each is marked “Not created yet” in the editor — press Create set on each, check the pieces, and save it.`,
    );
  }
  return {
    template: templateFor(offer, benefit),
    patch,
    proposedSets: proposals.list,
    notes: [...new Set([...notes, ...offer.notes])],
  };
}
