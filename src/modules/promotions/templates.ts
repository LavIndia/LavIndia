/**
 * The offers an admin starts from, in the words a jeweller uses.
 *
 * A template is data, not code: a name, a sentence, the cards the editor
 * shows, and the values it opens with. Every template maps onto the same
 * blocks, so adding a preset — "Wedding Season Trio" — is a new entry here,
 * never a new kind of promotion.
 */
import type { Benefit, Condition, PieceFilter } from "./contracts";

export type EditorCard =
  | "pieces"
  | "gets"
  | "bundle"
  | "tiers"
  | "orderTiers"
  | "value"
  | "minimums";

export interface PromotionTemplate {
  id: string;
  name: string;
  /** One line under the name in the gallery. */
  hint: string;
  group: "Sets & bundles" | "Buy X get Y" | "Price off" | "Whole order" | "Special";
  cards: EditorCard[];
  defaults: {
    benefit: Benefit;
    trigger?: "AUTOMATIC" | "CODE";
    channels?: Array<"ONLINE" | "STORE">;
    pieces?: PieceFilter;
    conditions?: Condition[];
    minSubtotalCents?: number | null;
    isRecurring?: boolean;
    recurrenceType?: "DAILY" | "WEEKLY" | "MONTHLY";
    recurrenceStartTime?: string;
    recurrenceEndTime?: string;
    combinesWithOtherClasses?: boolean;
  };
}

const EVERY_PIECE: PieceFilter = { include: [], exclude: [] };
const FREE = { type: "percent", bps: 10_000 } as const;

export const PROMOTION_TEMPLATES: PromotionTemplate[] = [
  {
    id: "ANY_N_FOR_X",
    name: "Any 3 for ₹999",
    hint: "A fixed price for any set of pieces",
    group: "Sets & bundles",
    cards: ["pieces", "value"],
    defaults: { benefit: { type: "setPrice", setSize: 3, priceCents: 99_900 } },
  },
  {
    id: "TIERED_SET_PRICE",
    name: "More you buy, less you pay",
    hint: "2 for ₹699 · 3 for ₹999 · 4 for ₹1,299",
    group: "Sets & bundles",
    cards: ["pieces", "tiers"],
    defaults: {
      benefit: {
        type: "setPriceTiers",
        leftovers: "NEW_SET",
        tiers: [
          { size: 2, priceCents: 69_900 },
          { size: 3, priceCents: 99_900 },
          { size: 4, priceCents: 1_29_900 },
        ],
      },
    },
  },
  {
    id: "BUNDLE",
    name: "Necklace + Earrings for ₹1,499",
    hint: "A set price for named kinds of piece together",
    group: "Sets & bundles",
    cards: ["bundle"],
    defaults: {
      benefit: {
        type: "bundle",
        priceCents: 1_49_900,
        components: [
          { pieces: EVERY_PIECE, quantity: 1 },
          { pieces: EVERY_PIECE, quantity: 1 },
        ],
      },
    },
  },
  {
    id: "BOGO",
    name: "Buy 1 Get 1 Free",
    hint: "The lower-priced piece is free",
    group: "Buy X get Y",
    cards: ["pieces", "gets"],
    defaults: {
      benefit: { type: "reward", buyQuantity: 1, getQuantity: 1, gets: null, value: FREE, pick: "CHEAPEST" },
    },
  },
  {
    id: "BUY_X_GET_Y",
    name: "Buy 2 Get 1 Free",
    hint: "Any quantities; free, a % off or a set price",
    group: "Buy X get Y",
    cards: ["pieces", "gets"],
    defaults: {
      benefit: { type: "reward", buyQuantity: 2, getQuantity: 1, gets: null, value: FREE, pick: "CHEAPEST" },
    },
  },
  {
    id: "BUY_THIS_GET_THAT",
    name: "Buy a necklace, earrings at 50%",
    hint: "Buy from some pieces, get a reward from others",
    group: "Buy X get Y",
    cards: ["pieces", "gets"],
    defaults: {
      benefit: {
        type: "reward",
        buyQuantity: 1,
        getQuantity: 1,
        gets: EVERY_PIECE,
        value: { type: "percent", bps: 5_000 },
        pick: "CHEAPEST",
      },
    },
  },
  {
    id: "PERCENT_OFF",
    name: "20% off Bangles",
    hint: "A percentage off chosen pieces",
    group: "Price off",
    cards: ["pieces", "value", "minimums"],
    defaults: { benefit: { type: "percentOff", bps: 2_000 } },
  },
  {
    id: "AMOUNT_OFF_EACH",
    name: "₹200 off every piece",
    hint: "A rupee amount off each chosen piece",
    group: "Price off",
    cards: ["pieces", "value", "minimums"],
    defaults: { benefit: { type: "amountOffEach", cents: 20_000 } },
  },
  {
    id: "FIXED_PRICE_EACH",
    name: "Everything at ₹499",
    hint: "One price for every chosen piece",
    group: "Price off",
    cards: ["pieces", "value"],
    defaults: { benefit: { type: "fixedPriceEach", cents: 49_900 } },
  },
  {
    id: "PERCENT_TIERS",
    name: "Buy more, save more",
    hint: "2 pieces 10% off · 3 pieces 15% off",
    group: "Price off",
    cards: ["pieces", "tiers"],
    defaults: {
      benefit: {
        type: "percentTiers",
        basis: "QUANTITY",
        tiers: [
          { min: 2, bps: 1_000 },
          { min: 3, bps: 1_500 },
        ],
      },
    },
  },
  {
    id: "SPEND_AND_SAVE",
    name: "Spend ₹5,000, get ₹500 off",
    hint: "An amount off the order above a spend",
    group: "Whole order",
    cards: ["value", "minimums"],
    defaults: { benefit: { type: "amountOffOrder", cents: 50_000 }, minSubtotalCents: 5_00_000 },
  },
  {
    id: "ORDER_TIERS",
    name: "Spend more, save more",
    hint: "₹5,000 → ₹500 off · ₹10,000 → ₹1,200 off",
    group: "Whole order",
    cards: ["orderTiers"],
    defaults: {
      benefit: {
        type: "orderTiers",
        tiers: [
          { minSubtotalCents: 5_00_000, amountOffCents: 50_000 },
          { minSubtotalCents: 10_00_000, amountOffCents: 1_20_000 },
        ],
      },
    },
  },
  {
    id: "COUPON",
    name: "Coupon code",
    hint: "A code for % or ₹ off the order",
    group: "Whole order",
    cards: ["value", "minimums"],
    defaults: { benefit: { type: "percentOffOrder", bps: 1_000 }, trigger: "CODE" },
  },
  {
    id: "FREE_DELIVERY",
    name: "Free delivery",
    hint: "Delivery free, optionally above a spend",
    group: "Whole order",
    cards: ["minimums"],
    defaults: {
      benefit: { type: "freeDelivery" },
      channels: ["ONLINE"],
      combinesWithOtherClasses: true,
    },
  },
  {
    id: "FIRST_ORDER",
    name: "Welcome offer",
    hint: "For a client's first order",
    group: "Special",
    cards: ["value", "minimums"],
    defaults: {
      benefit: { type: "percentOffOrder", bps: 1_000 },
      channels: ["ONLINE"],
      conditions: [{ type: "firstOrderOnly" }],
    },
  },
  {
    id: "HAPPY_HOUR",
    name: "Evening hours in store",
    hint: "An offer at set times of day",
    group: "Special",
    cards: ["pieces", "value"],
    defaults: {
      benefit: { type: "percentOff", bps: 1_000 },
      channels: ["STORE"],
      isRecurring: true,
      recurrenceType: "DAILY",
      recurrenceStartTime: "18:00",
      recurrenceEndTime: "21:00",
    },
  },
];

export function templateById(id: string): PromotionTemplate | undefined {
  return PROMOTION_TEMPLATES.find((template) => template.id === id);
}
