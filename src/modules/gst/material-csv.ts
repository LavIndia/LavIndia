/**
 * The product material sheet: a CSV that opens in Excel, is filled in, and
 * comes back in.
 *
 * Every product is a row, pre-filled with whatever is already known, so the
 * only work is the blank cells. Rows that cannot be understood are reported
 * with their line number and nothing is saved from them; a dry run shows the
 * lot before anything is written. Blank cells never overwrite what is there.
 *
 * Stones and pearls go in one cell, entries separated by ";" and the parts of
 * an entry by "|":   Pearl|PEARL|CULTURED ; Crystal|STONE|GLASS
 * and the word NONE says there are none.
 */
import Papa from "papaparse";
import { prisma } from "../_shared/db";
import type { Gem, GemOrigin, PlatingType } from "./composition";
import { saveComposition, type Actor, type CompositionInput } from "./classification";

export const COLUMNS = [
  "product_id", "product_name", "category", "base_metal", "alloy_notes", "plating_type", "plating_metal",
  "precious_metal", "precious_purity", "precious_weight_mg", "stones_and_pearls", "is_handmade", "handmade_notes",
  "supplier_name", "supplier_hsn", "material_notes", "confirmed_by",
] as const;

const PLATING: PlatingType[] = ["UNKNOWN", "NONE", "ELECTROPLATED", "PVD", "CLAD_BONDED", "SOLID_PRECIOUS"];
const ORIGINS: GemOrigin[] = ["NATURAL", "CULTURED", "SYNTHETIC", "RECONSTRUCTED", "GLASS", "CUBIC_ZIRCONIA", "OTHER", "UNKNOWN"];

const INSTRUCTIONS = [
  "# LavIndia GST product material sheet. Lines starting with # are ignored. Leave a cell blank to leave it unchanged.",
  `# plating_type: ${PLATING.join(" | ")}   (NONE = no precious metal at all; ELECTROPLATED/PVD = plating; CLAD_BONDED = bonded or rolled on; SOLID_PRECIOUS = the piece itself is precious metal)`,
  "# stones_and_pearls: Name|STONE or PEARL|ORIGIN ; next entry ...   ORIGIN is one of " + ORIGINS.join(", ") + ".   Write NONE if there are no stones or pearls.",
  "# is_handmade: yes or no.   supplier_hsn: digits only, as printed on the supplier's invoice (a hint, not a classification).",
  "# confirmed_by: your name, to say these details are right. Changing details later clears the confirmation.",
].join("\n");

function gemsCell(gems: unknown): string {
  if (!Array.isArray(gems)) return "";
  if (gems.length === 0) return "NONE";
  return (gems as Gem[]).map((g) => `${g.name}|${g.kind}|${g.origin}`).join(" ; ");
}

/** The sheet, one row per product, with what is already known filled in. */
export async function buildTemplate(): Promise<string> {
  const [products, profiles, pending] = await Promise.all([
    prisma.product.findMany({ select: { id: true, name: true, category: { select: { name: true } } }, orderBy: [{ categoryId: "asc" }, { name: "asc" }] }),
    prisma.gstProductProfile.findMany(),
    prisma.gstPendingCatalogItem.findMany({ where: { kind: "PRODUCT", status: "PENDING_IMPORT" }, orderBy: { name: "asc" } }),
  ]);
  const profileOf = new Map(profiles.map((p) => [p.productId, p]));
  const rows: string[][] = products.map((p) => {
    const f = profileOf.get(p.id);
    return [p.id, p.name, p.category.name, f?.baseMetal ?? "", f?.alloyNotes ?? "", f && f.platingType !== "UNKNOWN" ? f.platingType : "", f?.platingMetal ?? "", f?.preciousMetal ?? "", f?.preciousPurity ?? "", f?.preciousWeightMg?.toString() ?? "", gemsCell(f?.gems), f?.isHandmade == null ? "" : f.isHandmade ? "yes" : "no", f?.handmadeNotes ?? "", f?.supplierName ?? "", f?.supplierHsn ?? "", f?.materialNotes ?? "", f?.confirmedBy ?? ""];
  });
  // Pieces on the live shop but not yet in this catalog: the id stays blank until they are imported.
  for (const item of pending) rows.push(["", item.name, item.categoryName ?? "", ...Array(COLUMNS.length - 3).fill("")]);
  return "\uFEFF" + INSTRUCTIONS + "\n" + Papa.unparse({ fields: [...COLUMNS], data: rows }, { newline: "\n" });
}

export interface RowIssue {
  line: number;
  message: string;
}

interface Parsed {
  line: number;
  productId: string;
  name: string;
  input: CompositionInput;
}

function parseGems(cell: string, issues: string[]): Gem[] | null | undefined {
  const value = cell.trim();
  if (!value) return undefined;
  if (value.toUpperCase() === "NONE") return [];
  const gems: Gem[] = [];
  for (const part of value.split(";")) {
    const [name, kind, origin] = part.split("|").map((s) => s.trim());
    if (!name || !kind || !origin) { issues.push(`"${part.trim()}" needs a name, STONE or PEARL, and an origin`); continue; }
    if (kind.toUpperCase() !== "STONE" && kind.toUpperCase() !== "PEARL") { issues.push(`"${name}": kind must be STONE or PEARL`); continue; }
    if (!ORIGINS.includes(origin.toUpperCase() as GemOrigin)) { issues.push(`"${name}": origin must be one of ${ORIGINS.join(", ")}`); continue; }
    gems.push({ name, kind: kind.toUpperCase() as Gem["kind"], origin: origin.toUpperCase() as GemOrigin });
  }
  return gems;
}

/** Reads a returned sheet. Nothing is written. */
export function parseSheet(csv: string): { rows: Parsed[]; issues: RowIssue[]; blank: number } {
  const parsed = Papa.parse<Record<string, string>>(csv.replace(/^﻿/, ""), { header: true, skipEmptyLines: "greedy", comments: "#" });
  const issues: RowIssue[] = [];
  const rows: Parsed[] = [];
  let blank = 0;
  const headers = parsed.meta.fields ?? [];
  const absent = COLUMNS.filter((c) => !headers.includes(c));
  if (absent.length > 0) return { rows, blank, issues: [{ line: 0, message: `The sheet is missing these columns: ${absent.join(", ")}` }] };

  parsed.data.forEach((raw, index) => {
    const line = index + 2;
    const cell = (key: (typeof COLUMNS)[number]) => (raw[key] ?? "").trim();
    const problems: string[] = [];
    const productId = cell("product_id");
    if (!productId) { blank++; return; } // a piece not in the catalog yet
    const input: CompositionInput = {};

    if (cell("base_metal")) input.baseMetal = cell("base_metal");
    if (cell("alloy_notes")) input.alloyNotes = cell("alloy_notes");
    if (cell("plating_type")) {
      const value = cell("plating_type").toUpperCase() as PlatingType;
      if (PLATING.includes(value)) input.platingType = value; else problems.push(`plating_type must be one of ${PLATING.join(", ")}`);
    }
    if (cell("plating_metal")) input.platingMetal = cell("plating_metal");
    if (cell("precious_metal")) input.preciousMetal = cell("precious_metal");
    if (cell("precious_purity")) input.preciousPurity = cell("precious_purity");
    if (cell("precious_weight_mg")) {
      const weight = Number(cell("precious_weight_mg"));
      if (Number.isInteger(weight) && weight >= 0) input.preciousWeightMg = weight; else problems.push("precious_weight_mg must be a whole number of milligrams");
    }
    const gems = parseGems(cell("stones_and_pearls"), problems);
    if (gems !== undefined) input.gems = gems;
    if (cell("is_handmade")) {
      const v = cell("is_handmade").toLowerCase();
      if (["yes", "y", "true"].includes(v)) input.isHandmade = true; else if (["no", "n", "false"].includes(v)) input.isHandmade = false; else problems.push("is_handmade must be yes or no");
    }
    if (cell("handmade_notes")) input.handmadeNotes = cell("handmade_notes");
    if (cell("supplier_name")) input.supplierName = cell("supplier_name");
    if (cell("supplier_hsn")) {
      if (/^[0-9]{2,8}$/.test(cell("supplier_hsn"))) input.supplierHsn = cell("supplier_hsn"); else problems.push("supplier_hsn must be 2 to 8 digits");
    }
    if (cell("material_notes")) input.materialNotes = cell("material_notes");
    if (cell("confirmed_by")) input.confirmedBy = cell("confirmed_by");

    if (problems.length > 0) problems.forEach((message) => issues.push({ line, message }));
    else rows.push({ line, productId, name: cell("product_name"), input });
  });
  return { rows, issues, blank };
}

export interface ImportOutcome {
  saved: number;
  skippedNotInCatalog: number;
  issues: RowIssue[];
  dryRun: boolean;
}

export async function importSheet(csv: string, actor: Actor, dryRun: boolean): Promise<ImportOutcome> {
  const { rows, issues, blank } = parseSheet(csv);
  const known = new Set((await prisma.product.findMany({ where: { id: { in: rows.map((r) => r.productId) } }, select: { id: true } })).map((p) => p.id));
  let saved = 0;
  for (const row of rows) {
    if (!known.has(row.productId)) { issues.push({ line: row.line, message: `No product with id ${row.productId} in this catalog` }); continue; }
    if (!dryRun) {
      try { await saveComposition(row.productId, row.input, actor); saved++; }
      catch (error) { issues.push({ line: row.line, message: error instanceof Error ? error.message : "Could not be saved" }); }
    } else saved++;
  }
  return { saved, skippedNotInCatalog: blank, issues, dryRun };
}
