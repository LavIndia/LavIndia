/**
 * Content for the catalog enrichment pass.
 *
 * Separated from the script that applies it so the copy can be reviewed and
 * edited without reading any logic. Everything here describes the five
 * photographed necklaces — the options, groupings and filters a jewellery
 * storefront needs in order to be genuinely usable rather than merely
 * populated.
 */

/** Chain lengths offered across the necklace range, shortest first. */
export interface VariantOption {
  name: string;
  size: string;
  quantity: number;
  /** Paisa added to the product's base price for the longer chains. */
  priceDeltaCents?: number;
}

export interface ProductEnrichment {
  /** Matched on the product slug set by the curation pass. */
  slug: string;
  variants: VariantOption[];
  collections: string[];
  metalColour: "gold" | "silver";
  style: string;
}

export const PRODUCT_ENRICHMENT: ProductEnrichment[] = [
  {
    slug: "onyx-tablet-pendant-necklace",
    variants: [
      { name: "40 cm", size: "40 cm", quantity: 7 },
      { name: "45 cm", size: "45 cm", quantity: 5, priceDeltaCents: 10000 },
      { name: "50 cm", size: "50 cm", quantity: 3, priceDeltaCents: 20000 },
    ],
    collections: ["everyday-gold", "gifting"],
    metalColour: "gold",
    style: "minimal",
  },
  {
    slug: "molten-drop-collar",
    variants: [
      { name: "One size", size: "One size", quantity: 13 },
    ],
    collections: ["statement-pieces", "everyday-gold"],
    metalColour: "gold",
    style: "statement",
  },
  {
    slug: "celestial-sun-and-moon-pendant",
    variants: [
      { name: "45 cm", size: "45 cm", quantity: 4 },
      { name: "50 cm", size: "50 cm", quantity: 6, priceDeltaCents: 15000 },
    ],
    collections: ["silver-edit", "gifting"],
    metalColour: "silver",
    style: "celestial",
  },
  {
    slug: "layered-butterfly-necklace",
    variants: [
      { name: "Standard layering", size: "38 / 45 cm", quantity: 7 },
    ],
    collections: ["silver-edit"],
    metalColour: "silver",
    style: "minimal",
  },
  {
    slug: "puffed-heart-station-necklace",
    variants: [
      { name: "40 cm", size: "40 cm", quantity: 10 },
      { name: "45 cm", size: "45 cm", quantity: 6, priceDeltaCents: 10000 },
    ],
    collections: ["everyday-gold", "gifting"],
    metalColour: "gold",
    style: "minimal",
  },
];

export const COLLECTIONS: { slug: string; name: string; description: string }[] = [
  {
    slug: "everyday-gold",
    name: "Everyday Gold",
    description: "Warm gold-tone pieces light enough to wear from desk to dinner.",
  },
  {
    slug: "silver-edit",
    name: "The Silver Edit",
    description: "Cool-toned pieces with stones, for those who never wear gold.",
  },
  {
    slug: "statement-pieces",
    name: "Statement Pieces",
    description: "One piece, worn alone, that does the whole job.",
  },
  {
    slug: "gifting",
    name: "Gifting",
    description: "Chosen to be easy to give: safe sizing and broad appeal.",
  },
];

/**
 * Storefront filters.
 *
 * Deliberately a curated list rather than free text, so the same words are
 * used across every product and the facets stay meaningful as the catalog
 * grows.
 */
export const FILTERS: {
  slug: string;
  name: string;
  type: "CHECKBOX" | "COLOR" | "RANGE";
  order: number;
  options: { value: string; label: string; color?: string }[];
}[] = [
  {
    slug: "metal-colour",
    name: "Metal Colour",
    type: "COLOR",
    order: 1,
    options: [
      { value: "gold", label: "Gold", color: "#dcc064" },
      { value: "silver", label: "Silver", color: "#c9c7c2" },
    ],
  },
  {
    slug: "chain-length",
    name: "Chain Length",
    type: "CHECKBOX",
    order: 2,
    options: [
      { value: "38-40", label: "38 – 40 cm" },
      { value: "41-45", label: "41 – 45 cm" },
      { value: "46-50", label: "46 – 50 cm" },
    ],
  },
  {
    slug: "style",
    name: "Style",
    type: "CHECKBOX",
    order: 3,
    options: [
      { value: "minimal", label: "Minimal" },
      { value: "statement", label: "Statement" },
      { value: "celestial", label: "Celestial" },
    ],
  },
];

/**
 * Sample reviews, so review counts, star averages and the "verified purchase"
 * badge all have something real to render against.
 */
export const REVIEWS: { slug: string; rating: number; comment: string }[] = [
  {
    slug: "onyx-tablet-pendant-necklace",
    rating: 5,
    comment:
      "Wore it straight out of the box to a dinner and three people asked about it. The black sits beautifully against anything pale.",
  },
  {
    slug: "onyx-tablet-pendant-necklace",
    rating: 4,
    comment: "Lovely weight to it. I sized up to 45 cm and that was the right call.",
  },
  {
    slug: "molten-drop-collar",
    rating: 5,
    comment:
      "This is the one piece I reach for when I cannot decide. It does not need anything else with it.",
  },
  {
    slug: "celestial-sun-and-moon-pendant",
    rating: 5,
    comment: "The opal catches light far more than I expected from the photograph. Delighted.",
  },
  {
    slug: "layered-butterfly-necklace",
    rating: 4,
    comment: "The layering stays put, which is the whole point. No tangling so far.",
  },
  {
    slug: "puffed-heart-station-necklace",
    rating: 5,
    comment: "Bought it as a gift and ended up ordering a second one for myself.",
  },
];
