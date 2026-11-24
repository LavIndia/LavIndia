/**
 * What a piece is made of: the information a classification has to rest on,
 * and what is still missing from it.
 *
 * This file only reasons about the details — it decides nothing. A heading is
 * suggested from them (suggestHeadings) and a person approves or rejects it;
 * the suggestion is never a classification and the engine never reads it.
 */
export type GemOrigin = "NATURAL" | "CULTURED" | "SYNTHETIC" | "RECONSTRUCTED" | "GLASS" | "CUBIC_ZIRCONIA" | "OTHER" | "UNKNOWN";
export type PlatingType = "UNKNOWN" | "NONE" | "ELECTROPLATED" | "PVD" | "CLAD_BONDED" | "SOLID_PRECIOUS";

export interface Gem {
  name: string;
  kind: "STONE" | "PEARL";
  origin: GemOrigin;
  notes?: string;
}

export interface Composition {
  baseMetal: string | null;
  platingType: PlatingType;
  platingMetal: string | null;
  preciousMetal: string | null;
  preciousPurity: string | null;
  /** null = never answered; [] = confirmed there are no stones or pearls. */
  gems: Gem[] | null;
  confirmedBy: string | null;
}

export type InfoStatus = "MISSING" | "PARTIAL" | "COMPLETE";

const PLATED: PlatingType[] = ["ELECTROPLATED", "PVD", "CLAD_BONDED"];

/** What still has to be supplied before the details can be called complete. */
export function missingInformation(c: Composition): string[] {
  const missing: string[] = [];
  if (!c.baseMetal) missing.push("The base metal or alloy");
  if (c.platingType === "UNKNOWN") missing.push("Whether any precious metal is present: none, plated, clad or solid");
  if (PLATED.includes(c.platingType) && !c.platingMetal) missing.push("Which precious metal it is plated or clad with");
  if ((c.platingType === "SOLID_PRECIOUS" || c.platingType === "CLAD_BONDED") && (!c.preciousMetal || !c.preciousPurity)) {
    missing.push("The precious metal and its purity");
  }
  if (c.gems === null) missing.push("Stones and pearls: list them, or confirm there are none");
  for (const gem of c.gems ?? []) {
    if (gem.origin === "UNKNOWN") missing.push(`Whether the ${gem.name.toLowerCase()} is natural, cultured, synthetic, glass or cubic zirconia`);
  }
  if (!c.confirmedBy) missing.push("Confirmation from the owner that these details are right");
  return missing;
}

export function computeInfoStatus(c: Composition): InfoStatus {
  const started = !!c.baseMetal || c.platingType !== "UNKNOWN" || c.gems !== null;
  if (!started) return "MISSING";
  return missingInformation(c).length === 0 ? "COMPLETE" : "PARTIAL";
}

export interface HeadingSuggestion {
  code: string;
  because: string;
}

export interface Suggestions {
  headings: HeadingSuggestion[];
  caveats: string[];
}

const REAL_GEM: GemOrigin[] = ["NATURAL", "CULTURED", "SYNTHETIC", "RECONSTRUCTED"];

/**
 * Headings worth putting in front of the accountant, given the details. A
 * suggestion is a starting point with its reasons, never a decision: the
 * Chapter 71 Notes that settle the borderline cases have not been verified in
 * this system, and every suggestion says so.
 */
export function suggestHeadings(c: Composition): Suggestions {
  const caveats = [
    "A suggestion only. The Chapter 71 Notes that decide the borderline cases have not been checked here; the accountant decides.",
  ];
  if (c.platingType === "UNKNOWN") {
    return { headings: [], caveats: [...caveats, "Nothing can be suggested until it is known whether any precious metal is present."] };
  }

  const headings: HeadingSuggestion[] = [];
  const realGems = (c.gems ?? []).filter((g) => REAL_GEM.includes(g.origin));

  if (c.platingType === "SOLID_PRECIOUS" || c.platingType === "CLAD_BONDED") {
    headings.push({ code: "7113", because: "Jewellery \"of precious metal or of metal clad with precious metal\" is the wording of heading 7113" });
    if (c.platingType === "CLAD_BONDED") caveats.push("Whether bonded or rolled precious metal counts as \"clad\" for this heading is for the accountant to confirm.");
  } else {
    headings.push({ code: "7117", because: "Jewellery with no precious metal, or with precious metal only as plating, is a candidate for \"imitation jewellery\"" });
    if (c.platingType === "ELECTROPLATED" || c.platingType === "PVD") caveats.push("Plating is not the same as cladding; the accountant should confirm which this is.");
  }

  if (realGems.length > 0) {
    headings.push({ code: "7116", because: "It carries natural, cultured, synthetic or reconstructed stones or pearls, which can change the heading" });
    caveats.push("Because it carries stones or pearls that are not glass or cubic zirconia, 7117 may not apply. Confirm the heading with the accountant.");
  }
  return { headings, caveats };
}
