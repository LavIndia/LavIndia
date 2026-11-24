/**
 * States, place of supply and GSTIN checks.
 *
 * The state table is reference data keyed by the two-digit GST state code.
 * It is entered here from the published list and must be reviewed against the
 * GST portal before activation (the activation checklist asks for exactly
 * that) — a wrong row sends a sale to the wrong tax head.
 *
 * Nothing here assumes the shop's own state: it is read from the verified
 * business profile and is absent until someone supplies it.
 */
import type { SupplyType } from "./engine/types";

export interface GstState {
  code: string;
  name: string;
  aliases?: string[];
}

export const GST_STATES: readonly GstState[] = [
  { code: "01", name: "Jammu and Kashmir", aliases: ["j&k", "jammu & kashmir"] },
  { code: "02", name: "Himachal Pradesh" },
  { code: "03", name: "Punjab" },
  { code: "04", name: "Chandigarh" },
  { code: "05", name: "Uttarakhand", aliases: ["uttaranchal"] },
  { code: "06", name: "Haryana" },
  { code: "07", name: "Delhi", aliases: ["new delhi", "nct of delhi", "national capital territory of delhi"] },
  { code: "08", name: "Rajasthan" },
  { code: "09", name: "Uttar Pradesh", aliases: ["up"] },
  { code: "10", name: "Bihar" },
  { code: "11", name: "Sikkim" },
  { code: "12", name: "Arunachal Pradesh" },
  { code: "13", name: "Nagaland" },
  { code: "14", name: "Manipur" },
  { code: "15", name: "Mizoram" },
  { code: "16", name: "Tripura" },
  { code: "17", name: "Meghalaya" },
  { code: "18", name: "Assam" },
  { code: "19", name: "West Bengal" },
  { code: "20", name: "Jharkhand" },
  { code: "21", name: "Odisha", aliases: ["orissa"] },
  { code: "22", name: "Chhattisgarh", aliases: ["chattisgarh"] },
  { code: "23", name: "Madhya Pradesh", aliases: ["mp"] },
  { code: "24", name: "Gujarat" },
  { code: "26", name: "Dadra and Nagar Haveli and Daman and Diu", aliases: ["dadra & nagar haveli and daman & diu", "dadra and nagar haveli", "daman and diu", "daman & diu"] },
  { code: "27", name: "Maharashtra" },
  { code: "29", name: "Karnataka" },
  { code: "30", name: "Goa" },
  { code: "31", name: "Lakshadweep" },
  { code: "32", name: "Kerala" },
  { code: "33", name: "Tamil Nadu", aliases: ["tamilnadu"] },
  { code: "34", name: "Puducherry", aliases: ["pondicherry"] },
  { code: "35", name: "Andaman and Nicobar Islands", aliases: ["andaman & nicobar islands", "andaman and nicobar"] },
  { code: "36", name: "Telangana" },
  { code: "37", name: "Andhra Pradesh", aliases: ["ap"] },
  { code: "38", name: "Ladakh" },
  { code: "97", name: "Other Territory" },
  { code: "99", name: "Centre Jurisdiction" },
];

const normalise = (value: string) =>
  value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const BY_NAME = new Map<string, string>();
for (const state of GST_STATES) {
  BY_NAME.set(normalise(state.name), state.code);
  for (const alias of state.aliases ?? []) BY_NAME.set(normalise(alias), state.code);
}

/** The state code for a written state name, or null when it cannot be told. Never guessed. */
export function stateCodeFromName(name: string | null | undefined): string | null {
  if (!name) return null;
  const trimmed = name.trim();
  if (/^[0-9]{2}$/.test(trimmed) && GST_STATES.some((state) => state.code === trimmed)) return trimmed;
  return BY_NAME.get(normalise(trimmed)) ?? null;
}

export function stateName(code: string | null | undefined): string | null {
  return GST_STATES.find((state) => state.code === code)?.name ?? null;
}

export function supplyTypeFor(supplierStateCode: string, placeOfSupplyStateCode: string): SupplyType {
  return supplierStateCode === placeOfSupplyStateCode ? "INTRA_STATE" : "INTER_STATE";
}

export interface PlaceOfSupply {
  stateCode: string;
  supplyType: SupplyType;
  /** Why this state: recorded on the audit so the decision can be reviewed. */
  basis: string;
}

/**
 * Where a supply of goods is made, for the two ways this shop sells.
 *
 * A delivered order is supplied where the goods are delivered; a counter sale
 * is handed over in the shop. This follows the usual rule for goods, but it is
 * the accountant's to confirm — it is recorded as `basis` on every calculation.
 * Returns null when the state cannot be established; callers must treat that
 * as a failure, not default to the shop's own state.
 */
export function placeOfSupply(args: {
  channel: "ONLINE" | "STORE";
  supplierStateCode: string | null;
  deliveryStateName?: string | null;
  deliveryStateCode?: string | null;
}): PlaceOfSupply | null {
  const { channel, supplierStateCode } = args;
  if (!supplierStateCode) return null;
  if (channel === "STORE") {
    return {
      stateCode: supplierStateCode,
      supplyType: "INTRA_STATE",
      basis: "Counter sale: goods are handed over in the supplier's own state",
    };
  }
  const delivery = args.deliveryStateCode ?? stateCodeFromName(args.deliveryStateName);
  if (!delivery) return null;
  return {
    stateCode: delivery,
    supplyType: supplyTypeFor(supplierStateCode, delivery),
    basis: "Delivered order: the state the goods are delivered to",
  };
}

const GSTIN_FORMAT = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const CHARSET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** The check character for the first 14 characters of a GSTIN. */
export function gstinCheckCharacter(first14: string): string {
  let total = 0;
  for (let index = 0; index < 14; index++) {
    const value = CHARSET.indexOf(first14[index]);
    if (value < 0) return "?";
    const product = value * (index % 2 === 0 ? 1 : 2);
    total += Math.floor(product / 36) + (product % 36);
  }
  return CHARSET[(36 - (total % 36)) % 36];
}

export type GstinProblem = "FORMAT" | "STATE" | "CHECK_CHARACTER";

/** Null when the GSTIN is well-formed, has a real state code and a correct check character. */
export function gstinProblem(gstin: string): GstinProblem | null {
  const value = gstin.trim().toUpperCase();
  if (!GSTIN_FORMAT.test(value)) return "FORMAT";
  if (!GST_STATES.some((state) => state.code === value.slice(0, 2))) return "STATE";
  if (gstinCheckCharacter(value.slice(0, 14)) !== value[14]) return "CHECK_CHARACTER";
  return null;
}
