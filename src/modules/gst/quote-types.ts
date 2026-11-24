/**
 * What the GST engine attaches to a priced cart.
 *
 * The orders domain treats it as opaque: it carries it from the pricing step to
 * the moment an order is written, where it becomes an audit row (and, once the
 * invoice is issued, the GST particulars of that invoice).
 */
import type { GstResult, RateVersion, SupplyType } from "./engine/types";
import type { Unclassified } from "./rates/resolver";

export type GstPayloadStatus = "CALCULATED" | "MISSING_MAPPING" | "ERROR";

/** How each goods line was classified: filed under the line's index in the quote. */
export interface LineClassification {
  index: number;
  productId: string;
  name: string;
  quantity: number;
  amountCents: number;
  rate: RateVersion;
  mappingId: string;
}

export interface GstPayload {
  status: GstPayloadStatus;
  message?: string;
  supplierStateCode: string | null;
  placeOfSupplyCode: string | null;
  supplyType: SupplyType | null;
  placeOfSupplyBasis: string | null;
  pricesIncludeTax: boolean;
  /** Present when status is CALCULATED. */
  result?: GstResult;
  classifications: LineClassification[];
  missing: Unclassified[];
  /** The tax the existing engine worked out for the same cart. */
  legacyTaxCents: number;
  charges: { shippingCents: number; codFeeCents: number; shippingTreatment: string; codTreatment: string };
  deliveryState: string | null;
  mixedBasketPolicy: string;
}

export const ENGINE_VERSION = "gst-engine/1.0";
