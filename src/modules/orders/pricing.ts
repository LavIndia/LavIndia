/**
 * GST on jewellery, in basis points. 300 = 3%.
 *
 * Held here rather than in the invoice template, because tax is a property of
 * the sale, not of how the sale is printed. Pricing itself lives in
 * `quote.ts`, the one path both channels use.
 */
export const GST_RATE_BPS = 300;
