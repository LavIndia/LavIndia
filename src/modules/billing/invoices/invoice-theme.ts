/**
 * The invoice's visual constants.
 *
 * Kept apart from the template so the design can be adjusted without reading
 * any layout code, and shared by the renderer and the print stylesheet so the
 * screen and the printed page cannot drift apart.
 *
 * Declared as plain values rather than Panda tokens on purpose: this markup
 * is printed, and print engines routinely drop or re-order external CSS.
 * Inline values always survive the trip. The palette mirrors the brand tokens
 * in panda.config.ts — the deep chocolate here is the same family as the
 * storefront's `gold.700`, darkened for ink on paper.
 */
export const INVOICE_THEME = {
  /** Warm ivory page, matching the Canva reference. */
  page: "#f7f0e4",
  /** The white card the line items sit on. */
  card: "#ffffff",
  /** The single brand colour. Everything accented uses this one value. */
  ink: "#5a3212",
  inkSoft: "#8a6034",
  /** Body text — near-black rather than pure, which prints harsh. */
  text: "#241a12",
  textMuted: "#6b5a49",
  rule: "#d8c6ac",

  /** A4, with print-safe margins. */
  pageWidthMm: 210,
  pageHeightMm: 297,
  pageMarginMm: 14,

  /**
   * Serif for the wordmark, INVOICE and totals; clean sans for body and the
   * table. System stacks only — a webfont that fails to load mid-print leaves
   * a document set in something arbitrary.
   */
  serif: "'Georgia', 'Times New Roman', serif",
  sans: "'Helvetica Neue', Arial, sans-serif",
} as const;

/** Tabular figures so decimal points stack down the amount columns. */
export const NUMERIC_STYLE = {
  fontVariantNumeric: "tabular-nums",
  textAlign: "right",
} as const;
