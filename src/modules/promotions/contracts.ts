/**
 * The Promotions domain's vocabulary.
 *
 * A promotion is a fixed skeleton of typed blocks — which pieces count, what
 * must be true of the order, what the client gets, how often, and how it
 * plays with other offers. There is deliberately no expression language and
 * no nested AND/OR tree: inside one selector list the entries mean "any of
 * these", `exclude` means "and not", and conditions must all hold.
 *
 * Adding a capability means adding a new member to one of these unions, its
 * engine function, and its editor card. Nothing else changes shape.
 *
 * Money is integer paise throughout.
 */

export type Channel = "ONLINE" | "STORE";

// --- Which pieces --------------------------------------------------------

export type Selector =
  | { type: "all" }
  | { type: "categories"; ids: string[] }
  | { type: "collections"; ids: string[] }
  | { type: "products"; ids: string[] }
  | { type: "variants"; ids: string[] }
  | { type: "materials"; values: string[] }
  | { type: "colors"; values: string[] }
  | { type: "sizes"; values: string[] }
  | { type: "priceRange"; minCents?: number | null; maxCents?: number | null };

/**
 * Which pieces count.
 *
 * `include` is the first group of pieces; `or` holds any further groups,
 * each with its own categories and its own price, colour or size — so one
 * offer can cover "earrings at ₹200–₹400 or black necklaces under ₹600".
 * A piece counts if it fits any group and is not in `exclude`.
 * An empty `include` with no further groups means every piece.
 */
export interface PieceFilter {
  include: Selector[];
  exclude: Selector[];
  or?: Selector[][];
}

// --- Conditions on the order --------------------------------------------

export type Condition =
  /** Order subtotal at list price, before any offer. */
  | { type: "minOrderSubtotal"; cents: number }
  | { type: "minOrderQuantity"; quantity: number }
  | { type: "signedInOnly" }
  /** The client has no earlier order that counts. */
  | { type: "firstOrderOnly" }
  | { type: "customers"; customerIds: string[] }
  /** Named by instrument — Cash, UPI, Card, Cash on delivery — never gateway. */
  | { type: "paymentMethods"; methods: PaymentInstrument[] };

export type PaymentInstrument = "CASH" | "UPI" | "CARD" | "COD" | "ONLINE";

// --- What the client gets ------------------------------------------------

/** How a reward piece is discounted. `percent` 10000 bps = free. */
export type RewardValue =
  | { type: "percent"; bps: number }
  | { type: "amountOff"; cents: number }
  | { type: "fixedPrice"; cents: number };

export interface PriceTier {
  size: number;
  priceCents: number;
}

export interface PercentTier {
  /** Pieces (basis QUANTITY) or paise of matching pieces (basis SUBTOTAL). */
  min: number;
  bps: number;
}

export interface OrderTier {
  minSubtotalCents: number;
  amountOffCents?: number | null;
  bps?: number | null;
}

export interface BundleComponent {
  pieces: PieceFilter;
  quantity: number;
}

export type Benefit =
  // Piece offers — change the price of matching pieces.
  | { type: "percentOff"; bps: number }
  | { type: "amountOffEach"; cents: number }
  | { type: "fixedPriceEach"; cents: number }
  | { type: "percentTiers"; basis: "QUANTITY" | "SUBTOTAL"; tiers: PercentTier[] }
  | { type: "setPrice"; setSize: number; priceCents: number }
  | { type: "setPriceTiers"; tiers: PriceTier[]; leftovers: "NEW_SET" | "FULL_PRICE" }
  | {
      type: "reward";
      buyQuantity: number;
      getQuantity: number;
      /** Null means the reward comes from the same pieces as the purchase. */
      gets: PieceFilter | null;
      value: RewardValue;
      pick: "CHEAPEST" | "MOST_EXPENSIVE";
    }
  | { type: "bundle"; components: BundleComponent[]; priceCents: number }
  // Order offers — come off the subtotal after piece offers.
  | { type: "amountOffOrder"; cents: number }
  | { type: "percentOffOrder"; bps: number }
  | { type: "orderTiers"; tiers: OrderTier[] }
  // Delivery offers.
  | { type: "freeDelivery" };

export type BenefitType = Benefit["type"];
export type PromotionClass = "PIECE" | "ORDER" | "DELIVERY";

const ORDER_BENEFITS: ReadonlySet<BenefitType> = new Set([
  "amountOffOrder",
  "percentOffOrder",
  "orderTiers",
]);

export function classOf(benefit: Benefit): PromotionClass {
  if (benefit.type === "freeDelivery") return "DELIVERY";
  return ORDER_BENEFITS.has(benefit.type) ? "ORDER" : "PIECE";
}

// --- A promotion as the engine sees it ------------------------------------

export interface EngineSchedule {
  startsAt: Date | null;
  endsAt: Date | null;
  isRecurring: boolean;
  recurrenceType: string | null;
  recurrenceDaysOfWeek: number[];
  recurrenceDayOfMonth: number | null;
  recurrenceStartTime: string | null;
  recurrenceEndTime: string | null;
}

export interface EnginePromotion {
  id: string;
  /** What the client sees it called. */
  label: string;
  /** What the invoice prints against its discount, when set apart. */
  invoiceLabel: string | null;
  trigger: "AUTOMATIC" | "CODE";
  /** Upper-case codes that unlock a CODE promotion. */
  codes: string[];
  channels: Channel[];
  schedule: EngineSchedule;
  pieces: PieceFilter;
  minQuantity: number | null;
  minSubtotalCents: number | null;
  conditions: Condition[];
  benefit: Benefit;
  priceIncludesTax: boolean;
  maxApplicationsPerOrder: number | null;
  maxDiscountCents: number | null;
  combinesWithOtherClasses: boolean;
  exclusive: boolean;
  rank: number | null;
  createdAt: Date;
}

// --- The cart as the engine sees it ---------------------------------------

export interface EngineLine {
  lineId: string;
  variantId: string;
  productId: string;
  categoryId: string | null;
  collectionIds: string[];
  material: string | null;
  color: string | null;
  size: string | null;
  /** List price per unit, pre-tax. */
  unitPriceCents: number;
  quantity: number;
  /** A manually priced line is taken out of every offer. */
  locked?: boolean;
}

export interface EngineContext {
  channel: Channel;
  now: Date;
  /** Codes the client entered, any case. */
  codes: string[];
  customer: {
    id: string | null;
    /** Orders the client has placed before this one. */
    previousOrderCount: number;
  };
  paymentMethod: PaymentInstrument | null;
  /** What delivery would cost, so a free-delivery offer can be weighed. */
  shippingCents: number;
  /** GST rate used to turn a tax-inclusive offer price into a pre-tax one. */
  taxRateBps: number;
}

// --- What the engine answers -----------------------------------------------

export interface UnitAllocation {
  promotionId: string;
  label: string;
  code: string | null;
  applicationKey: string;
  cents: number;
}

export interface EngineUnit {
  lineId: string;
  /** 0-based index of the unit within its line. */
  index: number;
  listCents: number;
  discountCents: number;
  allocations: UnitAllocation[];
}

export interface AppliedPromotion {
  promotionId: string;
  label: string;
  class: PromotionClass;
  code: string | null;
  savingCents: number;
  applications: number;
}

export type RejectionReason =
  | "NOT_QUALIFIED"
  | "SAVES_LESS"
  | "NOT_COMBINABLE"
  | "EXCLUSIVE_ELSEWHERE"
  | "CODE_NOT_ENTERED";

export interface RejectedPromotion {
  promotionId: string;
  label: string;
  reason: RejectionReason;
  /** For SAVES_LESS: how much more the winning combination saves. */
  shortfallCents?: number;
}

/** "Add 1 more from Bangles" — what the client is short of for an offer. */
export interface Nudge {
  promotionId: string;
  label: string;
  remainingQuantity?: number;
  remainingCents?: number;
}

export interface Evaluation {
  units: EngineUnit[];
  applied: AppliedPromotion[];
  rejected: RejectedPromotion[];
  nudges: Nudge[];
  /** Codes entered that unlocked nothing, so the client can be told. */
  unusedCodes: string[];
  listSubtotalCents: number;
  pieceDiscountCents: number;
  orderDiscountCents: number;
  /** Delivery the client no longer pays for. */
  deliveryDiscountCents: number;
}
