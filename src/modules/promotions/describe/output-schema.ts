/**
 * What Claude sends back when an admin describes an offer in words.
 *
 * Deliberately flatter than PromotionInput and in the admin's own terms:
 * rupees not paise, percent not basis points, and pieces by the names the
 * shop uses (categories, collections, materials…) rather than ids. to-draft
 * turns it into an editor draft and resolves every name against the catalog,
 * so a name Claude invents can never reach an offer unnoticed.
 *
 * Written with zod/v4 because the SDK's structured-output helper uses it.
 */
import { z } from "zod/v4";

const nullableNumber = z.number().nullable();

export const describedSelectorSchema = z.object({
  kind: z
    .enum(["category", "collection", "product", "material", "colour", "size", "price", "markedDown"])
    .describe(
      "category, collection, product, material, colour and size use `names`; price uses minRupees/maxRupees; markedDown needs neither.",
    ),
  names: z.array(z.string()).describe("Names exactly as they appear in the catalog lists. Empty for price and markedDown."),
  minRupees: nullableNumber.describe("price only: lowest price, inclusive"),
  maxRupees: nullableNumber.describe("price only: highest price, inclusive"),
});

export const describedPiecesSchema = z.object({
  savedSets: z.array(z.string()).describe("Names of saved Piece Sets that hold the pieces. Usually empty."),
  groups: z
    .array(z.array(describedSelectorSchema))
    .describe(
      "Each group is one kind of piece; a piece counts if it fits ANY group. Within a group, categories/collections/products are alternatives, and material/colour/size/price/markedDown must ALL hold. No groups and no sets = every piece.",
    ),
  except: z.array(describedSelectorSchema).describe("Pieces left out even if a group matches."),
});

const tierSchema = z.object({
  threshold: z
    .number()
    .describe("percentTiers: pieces (QUANTITY) or rupees spent (SUBTOTAL). setPriceTiers: set size. orderTiers: rupees spent."),
  percent: nullableNumber.describe("percent off at this step (percentTiers, orderTiers)"),
  rupees: nullableNumber.describe("setPriceTiers: price of the set; orderTiers: rupees off"),
});

export const describedBenefitSchema = z.object({
  type: z.enum([
    "setPrice",
    "setPriceTiers",
    "bundle",
    "reward",
    "percentOff",
    "amountOffEach",
    "fixedPriceEach",
    "percentTiers",
    "amountOffOrder",
    "percentOffOrder",
    "orderTiers",
    "freeDelivery",
  ]),
  percent: nullableNumber.describe("percentOff, percentOffOrder"),
  rupees: nullableNumber.describe(
    "amountOffEach, fixedPriceEach, amountOffOrder: the amount. setPrice and bundle: the price of the set.",
  ),
  setSize: nullableNumber.describe("setPrice: how many pieces make the set"),
  buyQuantity: nullableNumber.describe("reward: pieces bought"),
  getQuantity: nullableNumber.describe("reward: pieces rewarded"),
  rewardKind: z.enum(["free", "percentOff", "rupeesOff", "fixedPrice"]).nullable().describe("reward only"),
  rewardAmount: nullableNumber.describe("reward: percent for percentOff, rupees for rupeesOff/fixedPrice"),
  rewardPieces: describedPiecesSchema
    .nullable()
    .describe("reward: the pieces the reward comes from when different from the ones bought; null = the same pieces"),
  pick: z.enum(["CHEAPEST", "MOST_EXPENSIVE"]).nullable().describe("reward: which piece is rewarded; normally CHEAPEST"),
  tierBasis: z.enum(["QUANTITY", "SUBTOTAL"]).nullable().describe("percentTiers only"),
  tiers: z.array(tierSchema).nullable().describe("percentTiers, setPriceTiers, orderTiers"),
  leftovers: z
    .enum(["NEW_SET", "FULL_PRICE"])
    .nullable()
    .describe("setPriceTiers: pieces beyond the biggest set start a new set (NEW_SET) or pay full price"),
  components: z
    .array(z.object({ pieces: describedPiecesSchema, quantity: z.number() }))
    .nullable()
    .describe("bundle: two or more parts, e.g. 1 necklace + 1 pair of earrings"),
});

export const describedOfferSchema = z.object({
  isOffer: z.boolean().describe("false when the text does not describe an offer at all"),
  name: z.string().describe("Short internal name, e.g. 'Diwali earrings 3 for ₹999'"),
  trigger: z.enum(["AUTOMATIC", "CODE"]).describe("CODE only when the client must type a code"),
  code: z.string().nullable().describe("The code, when one was given; letters, numbers, - and _ only"),
  channels: z.array(z.enum(["ONLINE", "STORE"])).describe("ONLINE = website, STORE = counter. Both unless the text limits it."),
  pieces: describedPiecesSchema.describe("Which pieces the offer is on (for order offers: which pieces count towards it)"),
  benefit: describedBenefitSchema,
  minOrderRupees: nullableNumber.describe("Minimum spend on the qualifying pieces"),
  minPieces: nullableNumber.describe("Minimum number of qualifying pieces"),
  signedInOnly: z.boolean(),
  firstOrderOnly: z.boolean(),
  paymentMethods: z
    .array(z.enum(["CASH", "UPI", "CARD", "COD", "ONLINE"]))
    .describe("Only when the text limits the offer to ways of paying; otherwise empty"),
  startsAt: z.string().nullable().describe("India time, YYYY-MM-DDTHH:mm; null = from now"),
  endsAt: z.string().nullable().describe("India time, YYYY-MM-DDTHH:mm; null = no end"),
  recurrence: z
    .object({
      type: z.enum(["DAILY", "WEEKLY", "MONTHLY"]),
      daysOfWeek: z.array(z.number()).describe("WEEKLY: 0 = Sunday … 6 = Saturday"),
      dayOfMonth: nullableNumber.describe("MONTHLY: 1–31"),
      startTime: z.string().nullable().describe("HH:mm"),
      endTime: z.string().nullable().describe("HH:mm"),
    })
    .nullable()
    .describe("Only for offers that repeat, e.g. every evening 6–9 or every Friday"),
  maxTimesPerOrder: nullableNumber.describe("How many times the offer can apply in one order"),
  perClientLimit: nullableNumber.describe("How many orders each client can use it on"),
  totalUses: nullableNumber.describe("How many orders in total can use it"),
  maxDiscountRupees: nullableNumber.describe("Cap on the saving per order"),
  budgetRupees: nullableNumber.describe("Total amount the shop will give away before the offer stops"),
  exclusive: z.boolean().describe("true only when the text says no other offer may apply with it"),
  badge: z.string().nullable().describe("A short tag for product cards, at most 40 characters, e.g. '3 for ₹999'"),
  notes: z
    .array(z.string())
    .describe(
      "Plain-English points for the admin: every assumption made, anything left out or not understood, and any name that is not in the catalog.",
    ),
});

export type DescribedOffer = z.infer<typeof describedOfferSchema>;
export type DescribedPieces = z.infer<typeof describedPiecesSchema>;
export type DescribedSelector = z.infer<typeof describedSelectorSchema>;
export type DescribedBenefit = z.infer<typeof describedBenefitSchema>;
