/**
 * Label sheet and roll formats.
 *
 * Dimensions are in millimetres because that is how label stock is sold and
 * how a printer driver thinks. CSS honours real `mm` units when printing, so
 * a label declared 63.5mm wide comes out 63.5mm wide — which matters, since a
 * barcode printed even slightly under size stops scanning reliably.
 *
 * The A4 formats match widely available stock so the owner can buy sheets off
 * the shelf rather than ordering something bespoke.
 */

export type LabelFormatId =
  | "A4_21"
  | "A4_24"
  | "A4_40"
  | "A4_65"
  | "ROLL_50x25"
  | "ROLL_38x19";

export interface LabelFormat {
  id: LabelFormatId;
  name: string;
  /** What this stock is commonly sold as, so it can be reordered. */
  equivalent?: string;
  labelWidthMm: number;
  labelHeightMm: number;
  /** Continuous roll stock prints one label at a time. */
  kind: "SHEET" | "ROLL";
  columns: number;
  rows: number;
  pageMarginTopMm: number;
  pageMarginLeftMm: number;
  columnGapMm: number;
  rowGapMm: number;
  /** How much detail fits. Small labels drop the product name. */
  density: "COMFORTABLE" | "COMPACT" | "MINIMAL";
}

export const LABEL_FORMATS: LabelFormat[] = [
  {
    id: "A4_21",
    name: "A4 sheet · 21 labels",
    equivalent: "63.5 × 38.1 mm (Avery L7160)",
    labelWidthMm: 63.5,
    labelHeightMm: 38.1,
    kind: "SHEET",
    columns: 3,
    rows: 7,
    pageMarginTopMm: 15.1,
    pageMarginLeftMm: 7.2,
    columnGapMm: 2.5,
    rowGapMm: 0,
    density: "COMFORTABLE",
  },
  {
    id: "A4_24",
    name: "A4 sheet · 24 labels",
    equivalent: "63.5 × 33.9 mm (Avery L7159)",
    labelWidthMm: 63.5,
    labelHeightMm: 33.9,
    kind: "SHEET",
    columns: 3,
    rows: 8,
    pageMarginTopMm: 13,
    pageMarginLeftMm: 7.2,
    columnGapMm: 2.5,
    rowGapMm: 0,
    density: "COMFORTABLE",
  },
  {
    id: "A4_40",
    name: "A4 sheet · 40 labels",
    equivalent: "45.7 × 25.4 mm (Avery L7654)",
    labelWidthMm: 45.7,
    labelHeightMm: 25.4,
    kind: "SHEET",
    columns: 4,
    rows: 10,
    pageMarginTopMm: 21.5,
    pageMarginLeftMm: 9.8,
    columnGapMm: 2.5,
    rowGapMm: 0,
    density: "COMPACT",
  },
  {
    id: "A4_65",
    name: "A4 sheet · 65 labels",
    equivalent: "38.1 × 21.2 mm (Avery L7651)",
    labelWidthMm: 38.1,
    labelHeightMm: 21.2,
    kind: "SHEET",
    columns: 5,
    rows: 13,
    pageMarginTopMm: 10.7,
    pageMarginLeftMm: 4.7,
    columnGapMm: 2.5,
    rowGapMm: 0,
    density: "MINIMAL",
  },
  {
    id: "ROLL_50x25",
    name: "Label roll · 50 × 25 mm",
    equivalent: "thermal printer roll",
    labelWidthMm: 50,
    labelHeightMm: 25,
    kind: "ROLL",
    columns: 1,
    rows: 1,
    pageMarginTopMm: 0,
    pageMarginLeftMm: 0,
    columnGapMm: 0,
    rowGapMm: 0,
    density: "COMPACT",
  },
  {
    id: "ROLL_38x19",
    name: "Label roll · 38 × 19 mm",
    equivalent: "small jewellery tag",
    labelWidthMm: 38,
    labelHeightMm: 19,
    kind: "ROLL",
    columns: 1,
    rows: 1,
    pageMarginTopMm: 0,
    pageMarginLeftMm: 0,
    columnGapMm: 0,
    rowGapMm: 0,
    density: "MINIMAL",
  },
];

export const DEFAULT_LABEL_FORMAT: LabelFormatId = "A4_24";

export function getLabelFormat(id: string | undefined): LabelFormat {
  return (
    LABEL_FORMATS.find((format) => format.id === id) ??
    LABEL_FORMATS.find((format) => format.id === DEFAULT_LABEL_FORMAT)!
  );
}

/** Labels per printed page. A roll is one at a time. */
export function labelsPerPage(format: LabelFormat): number {
  return format.columns * format.rows;
}

/**
 * Module width for the barcode, in millimetres.
 *
 * The narrow bar is the thing that decides whether a label scans. Below about
 * 0.19mm most handheld scanners start to struggle, so this scales with the
 * label but never goes under that floor — a slightly cramped label that scans
 * beats a tidy one that does not.
 */
export function barcodeModuleWidthMm(format: LabelFormat): number {
  const usableWidth = format.labelWidthMm - 4; // 2mm padding each side
  // A 13-character Code 128 symbol is 178 modules including quiet zones.
  const ideal = usableWidth / 178;
  return Math.max(0.19, Math.min(ideal, 0.33));
}


/* Vertical space budgeting now lives in ./label-layout, which needs to know
   what a given label actually contains — see that file. */
