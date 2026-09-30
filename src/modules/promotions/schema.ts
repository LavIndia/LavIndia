/**
 * The shape of every block, as validated on the way into the database.
 *
 * The JSON columns on Promotion are only ever written through these schemas,
 * so the engine can trust what it reads. Each block carries its `type`, which
 * is how a block gains a new version without a migration.
 */
import { z } from "zod";

const id = z.string().min(1);
const cents = z.number().int().min(0);
const positiveCents = z.number().int().positive();
const count = z.number().int().positive();
const bps = z.number().int().min(1).max(10_000);

export const selectorSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("all") }),
  z.object({ type: z.literal("categories"), ids: z.array(id).min(1) }),
  z.object({ type: z.literal("collections"), ids: z.array(id).min(1) }),
  z.object({ type: z.literal("products"), ids: z.array(id).min(1) }),
  z.object({ type: z.literal("variants"), ids: z.array(id).min(1) }),
  z.object({ type: z.literal("materials"), values: z.array(z.string().min(1)).min(1) }),
  z.object({ type: z.literal("colors"), values: z.array(z.string().min(1)).min(1) }),
  z.object({ type: z.literal("sizes"), values: z.array(z.string().min(1)).min(1) }),
  z.object({
    type: z.literal("priceRange"),
    minCents: cents.nullable().optional(),
    maxCents: cents.nullable().optional(),
  }),
]);

export const pieceFilterSchema = z.object({
  include: z.array(selectorSchema).default([]),
  exclude: z.array(selectorSchema).default([]),
  /** Further groups of pieces, each narrowed on its own. */
  or: z.array(z.array(selectorSchema)).max(10).optional(),
});

export const conditionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("minOrderSubtotal"), cents: positiveCents }),
  z.object({ type: z.literal("minOrderQuantity"), quantity: count }),
  z.object({ type: z.literal("signedInOnly") }),
  z.object({ type: z.literal("firstOrderOnly") }),
  z.object({ type: z.literal("customers"), customerIds: z.array(id).min(1) }),
  z.object({
    type: z.literal("paymentMethods"),
    methods: z.array(z.enum(["CASH", "UPI", "CARD", "COD", "ONLINE"])).min(1),
  }),
]);

const rewardValueSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("percent"), bps }),
  z.object({ type: z.literal("amountOff"), cents: positiveCents }),
  z.object({ type: z.literal("fixedPrice"), cents }),
]);

export const benefitSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("percentOff"), bps }),
  z.object({ type: z.literal("amountOffEach"), cents: positiveCents }),
  z.object({ type: z.literal("fixedPriceEach"), cents }),
  z.object({
    type: z.literal("percentTiers"),
    basis: z.enum(["QUANTITY", "SUBTOTAL"]),
    tiers: z.array(z.object({ min: count, bps })).min(1),
  }),
  z.object({ type: z.literal("setPrice"), setSize: count, priceCents: positiveCents }),
  z.object({
    type: z.literal("setPriceTiers"),
    tiers: z.array(z.object({ size: count, priceCents: positiveCents })).min(1),
    leftovers: z.enum(["NEW_SET", "FULL_PRICE"]),
  }),
  z.object({
    type: z.literal("reward"),
    buyQuantity: z.number().int().min(0),
    getQuantity: count,
    gets: pieceFilterSchema.nullable(),
    value: rewardValueSchema,
    pick: z.enum(["CHEAPEST", "MOST_EXPENSIVE"]),
  }),
  z.object({
    type: z.literal("bundle"),
    components: z.array(z.object({ pieces: pieceFilterSchema, quantity: count })).min(2),
    priceCents: positiveCents,
  }),
  z.object({ type: z.literal("amountOffOrder"), cents: positiveCents }),
  z.object({ type: z.literal("percentOffOrder"), bps }),
  z.object({
    type: z.literal("orderTiers"),
    tiers: z
      .array(
        z.object({
          minSubtotalCents: positiveCents,
          amountOffCents: positiveCents.nullable().optional(),
          bps: bps.nullable().optional(),
        }),
      )
      .min(1),
  }),
  z.object({ type: z.literal("freeDelivery") }),
]);

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM");
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .optional()
    .transform((value) => (value ? value : null));

/** Everything the editor saves. Lifecycle fields are changed by actions. */
export const promotionInputSchema = z.object({
  name: z.string().trim().min(1, "Give the offer a name").max(120),
  description: optionalText(1000),
  template: z.string().min(1),
  trigger: z.enum(["AUTOMATIC", "CODE"]),
  code: z
    .string()
    .trim()
    .max(40)
    .regex(/^[A-Za-z0-9_-]*$/, "Codes use letters, numbers, - and _ only")
    .nullable()
    .optional()
    .transform((value) => (value ? value.toUpperCase() : null)),
  channels: z.array(z.enum(["ONLINE", "STORE"])).min(1, "Choose at least one channel"),
  pieces: pieceFilterSchema,
  conditions: z.array(conditionSchema).default([]),
  benefit: benefitSchema,
  minQuantity: count.nullable().optional().default(null),
  minSubtotalCents: positiveCents.nullable().optional().default(null),
  priceIncludesTax: z.boolean().default(false),
  maxApplicationsPerOrder: count.nullable().optional().default(null),
  maxDiscountCents: positiveCents.nullable().optional().default(null),
  usageLimit: count.nullable().optional().default(null),
  perCustomerLimit: count.nullable().optional().default(null),
  budgetCents: positiveCents.nullable().optional().default(null),
  combinesWithOtherClasses: z.boolean().default(false),
  exclusive: z.boolean().default(false),
  rank: z.number().int().min(0).nullable().optional().default(null),
  startsAt: z.coerce.date().nullable().optional().default(null),
  endsAt: z.coerce.date().nullable().optional().default(null),
  isRecurring: z.boolean().default(false),
  recurrenceType: z.enum(["DAILY", "WEEKLY", "MONTHLY"]).nullable().optional().default(null),
  recurrenceDaysOfWeek: z.array(z.number().int().min(0).max(6)).default([]),
  recurrenceDayOfMonth: z.number().int().min(1).max(31).nullable().optional().default(null),
  recurrenceStartTime: hhmm.nullable().optional().default(null),
  recurrenceEndTime: hhmm.nullable().optional().default(null),
  title: optionalText(120),
  badge: optionalText(40),
  nudgeText: optionalText(160),
  appliedText: optionalText(160),
  terms: optionalText(1000),
  invoiceLabel: optionalText(80),
  showOnStorefront: z.boolean().default(false),
  slug: z
    .string()
    .trim()
    .max(80)
    .regex(/^[a-z0-9-]*$/, "Use lower-case letters, numbers and dashes")
    .nullable()
    .optional()
    .transform((value) => (value ? value : null)),
});

export type PromotionInput = z.infer<typeof promotionInputSchema>;
