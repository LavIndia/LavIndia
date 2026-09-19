/**
 * How a label's vertical space is spent.
 *
 * A label is a fixed box of a few hundred square millimetres, so every
 * element on it competes for the same budget. Rather than picking heights by
 * eye and hoping, this measures the fixed text first, hands the remainder to
 * the barcode, and then spreads whatever is still left across the gaps and
 * the padding — so the label fills its stock evenly instead of clustering
 * its content in the middle with dead bands above and below.
 *
 * Two things make that budget content-dependent rather than format-dependent:
 * a piece with no distinct variant name and a piece with no SKU each free up
 * a whole line. Those lines are reclaimed here instead of being left blank.
 *
 * Everything is in millimetres, because that is what survives the trip to a
 * printer — see `label-formats` for why.
 */

import type { LabelFormat } from "./label-formats";

/** A draggable block on the label, in the order it is stacked. */
export type LabelElementId = "brand" | "name" | "variant" | "barcode" | "footer";

export const LABEL_ELEMENTS: { id: LabelElementId; name: string; note: string }[] = [
  { id: "brand", name: "Brand", note: "LAVINDIA" },
  { id: "name", name: "Product name", note: "Wraps, then clips" },
  { id: "variant", name: "Variant", note: "Hidden on default options" },
  { id: "barcode", name: "Barcode", note: "Bars and the code beneath" },
  { id: "footer", name: "SKU and price", note: "One row, opposite ends" },
];

export const DEFAULT_ELEMENT_ORDER: LabelElementId[] = [
  "brand",
  "name",
  "variant",
  "barcode",
  "footer",
];

/**
 * The admin's own adjustments on top of the computed layout.
 *
 * Held per label format, because what fits on a 63.5 × 38.1 mm sheet label is
 * not what fits on a 38 × 19 mm jewellery tag.
 */
export interface LabelLayoutOverrides {
  order: LabelElementId[];
  hidden: LabelElementId[];
  showSku: boolean;
  showPrice: boolean;
  /** Multiplies every font size. 1 is the computed default. */
  textScale: number;
  /** Pins the bar height instead of letting it take the remainder. */
  barcodeHeightMm: number | null;
  /** Pins the inner margin instead of letting it absorb slack. */
  paddingMm: number | null;
}

/** What this particular label has to say, which changes what fits. */
export interface LabelContent {
  hasVariantName: boolean;
  hasSku: boolean;
}

/** Sensible starting point for a format, before the admin touches anything. */
export function defaultLayoutOverrides(format: LabelFormat): LabelLayoutOverrides {
  const hidden: LabelElementId[] = [];
  if (format.density === "MINIMAL") hidden.push("name");
  if (format.density !== "COMFORTABLE") hidden.push("variant");

  return {
    order: [...DEFAULT_ELEMENT_ORDER],
    hidden,
    showSku: format.density !== "MINIMAL",
    showPrice: true,
    textScale: 1,
    barcodeHeightMm: null,
    paddingMm: null,
  };
}

export interface LabelLayout {
  paddingMm: number;
  gapMm: number;
  barcodeHeightMm: number;
  brandFontMm: number;
  nameFontMm: number;
  variantFontMm: number;
  codeFontMm: number;
  footerFontMm: number;
  /** Lines the product name may wrap onto before being clipped. */
  nameLines: number;
  showSku: boolean;
  showPrice: boolean;
  /** Blocks to render, in order, already filtered to what is present. */
  blocks: LabelElementId[];
  /** True when the content cannot fit even at minimum spacing. */
  overflowing: boolean;
}

/** Guards against a stored order that predates a change to the element set. */
function sanitizeOrder(order: LabelElementId[]): LabelElementId[] {
  const known = order.filter((id) => DEFAULT_ELEMENT_ORDER.includes(id));
  const missing = DEFAULT_ELEMENT_ORDER.filter((id) => !known.includes(id));
  return [...known, ...missing];
}

/** The gap between the bars and the code beneath them — they read as one. */
const CODE_GAP_MM = 0.3;

/** Below this, most handheld scanners struggle at an angle. */
const MIN_BARCODE_HEIGHT_MM = 6;
const MAX_BARCODE_HEIGHT_MM = 16;

export function labelLayout(
  format: LabelFormat,
  overrides: LabelLayoutOverrides = defaultLayoutOverrides(format),
  content: LabelContent = { hasVariantName: true, hasSku: true },
): LabelLayout {
  const minimal = format.density === "MINIMAL";
  const scale = clamp(overrides.textScale, 0.75, 1.4);

  const brandFontMm = (minimal ? 1.7 : 2) * scale;
  const nameFontMm = (format.density === "COMFORTABLE" ? 2.3 : 2) * scale;
  const variantFontMm = 1.9 * scale;
  const codeFontMm = (minimal ? 1.7 : 1.9) * scale;
  const footerFontMm = (minimal ? 1.9 : 2.1) * scale;
  const nameLines = format.density === "COMFORTABLE" ? 2 : 1;

  const showSku = overrides.showSku && content.hasSku;
  const showPrice = overrides.showPrice;

  const present = (id: LabelElementId) => {
    if (overrides.hidden.includes(id)) return false;
    if (id === "variant") return content.hasVariantName;
    if (id === "footer") return showSku || showPrice;
    return true;
  };

  const blocks = sanitizeOrder(overrides.order).filter(present);

  // Text occupies roughly 1.15x its font size per rendered line.
  const line = (fontMm: number, lines = 1) => fontMm * 1.15 * lines;

  const fixedHeight = blocks.reduce((total, id) => {
    if (id === "brand") return total + line(brandFontMm);
    if (id === "name") return total + line(nameFontMm, nameLines);
    if (id === "variant") return total + line(variantFontMm);
    if (id === "footer") return total + line(footerFontMm);
    // The barcode's own bars are the free variable; only the human-readable
    // code beneath them is fixed.
    return total + CODE_GAP_MM + line(codeFontMm);
  }, 0);

  const minGapMm = minimal ? 0.3 : 0.5;
  const maxGapMm = minimal ? 1.1 : 1.8;
  const basePaddingMm = overrides.paddingMm ?? (minimal ? 1 : 1.5);
  const maxPaddingMm = minimal ? 2 : 3.5;
  const gapCount = Math.max(0, blocks.length - 1);

  const spare =
    format.labelHeightMm - basePaddingMm * 2 - minGapMm * gapCount - fixedHeight;

  const hasBarcode = blocks.includes("barcode");
  const barcodeHeightMm = hasBarcode
    ? overrides.barcodeHeightMm ??
      clamp(spare, MIN_BARCODE_HEIGHT_MM, MAX_BARCODE_HEIGHT_MM)
    : 0;

  // Whatever the bars did not need is spread over the gaps first — even
  // spacing reads as deliberate, where a single fat margin reads as a bug —
  // and only then into the padding, which is capped so content never drifts
  // towards the die-cut edge where trimming tolerance can clip it.
  let slack = spare - barcodeHeightMm;
  let gapMm = minGapMm;
  let paddingMm = basePaddingMm;

  if (slack > 0 && gapCount > 0) {
    const gapRoom = (maxGapMm - minGapMm) * gapCount;
    const toGaps = Math.min(slack, gapRoom);
    gapMm = minGapMm + toGaps / gapCount;
    slack -= toGaps;
  }
  if (slack > 0) {
    paddingMm = Math.min(maxPaddingMm, basePaddingMm + slack / 2);
  }

  return {
    paddingMm,
    gapMm,
    barcodeHeightMm,
    brandFontMm,
    nameFontMm,
    variantFontMm,
    codeFontMm,
    footerFontMm,
    nameLines,
    showSku,
    showPrice,
    blocks,
    overflowing: spare < 0,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
