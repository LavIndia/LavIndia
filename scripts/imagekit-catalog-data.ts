/**
 * Catalog data for the ImageKit starter seed.
 *
 * Kept apart from the seeding logic so the two can be reviewed separately:
 * this file is the editable content, the script is the mechanism.
 *
 * Names and copy here are only accurate where the image was actually
 * examined. Everything else is an explicit placeholder — see
 * `placeholderNameFor` — because inventing convincing product names for
 * photographs nobody has looked at would put fiction into the catalog.
 */

export type CategorySlug = "earrings" | "necklaces" | "rings";

export const CATEGORY_DEFINITIONS: {
  slug: CategorySlug;
  name: string;
  description: string;
  isFeatured: boolean;
  featuredOrder: number;
}[] = [
  {
    slug: "earrings",
    name: "Earrings",
    description: "Studs, drops and hoops, finished by hand.",
    isFeatured: true,
    featuredOrder: 1,
  },
  {
    slug: "necklaces",
    name: "Necklaces",
    description: "Chains, pendants and statement pieces.",
    isFeatured: true,
    featuredOrder: 2,
  },
  {
    slug: "rings",
    name: "Rings",
    description: "Everyday bands and occasion rings.",
    isFeatured: true,
    featuredOrder: 3,
  },
];

/** ImageKit's folder names do not all match the category slugs. */
const FOLDER_TO_CATEGORY: Record<string, CategorySlug> = {
  earrings: "earrings",
  necklace: "necklaces",
  necklaces: "necklaces",
  rings: "rings",
};

/**
 * The category a product image belongs to, read from its ImageKit folder.
 *
 * Returns null for a file sitting loose in the products root. A loose file is
 * treated as a fault, never guessed at: its folder is the only statement of
 * which category it belongs to, and inventing one would put a product in the
 * wrong place while looking perfectly fine.
 */
export function categoryForFolder(filePath: string): CategorySlug | null {
  const segments = filePath.split("/");
  const folder = segments[segments.length - 2] ?? "";
  return FOLDER_TO_CATEGORY[folder] ?? null;
}

/**
 * Whether an image path is properly filed under a category folder.
 *
 * Shared by the seeder and anything else that consumes media-library paths,
 * so "must live in a category folder" is stated once.
 */
export function isCategoryScopedImage(filePath: string): boolean {
  return categoryForFolder(filePath) !== null;
}

export interface CuratedProduct {
  name?: string;
  description?: string;
  priceCents?: number;
  compareAtCents?: number;
  quantity?: number;
  category?: CategorySlug;
  /** Drives the Featured rail and the homepage Explore section. */
  isFeatured?: boolean;
  /** Drives the Limited Edition badge. */
  isLimitedEdition?: boolean;
  /**
   * Backdates the product. "New Arrival" is computed from creation date over
   * a 30-day window, so without a spread every product carries the badge and
   * the tag proves nothing.
   */
  createdDaysAgo?: number;
  /** Set when the image must not become a LavIndia listing at all. */
  exclude?: boolean;
  excludeReason?: string;
}

/**
 * Products whose photograph was actually examined, keyed by ImageKit
 * filename. These get real names and real descriptions.
 */
export const CURATED_PRODUCTS: Record<string, CuratedProduct> = {
  "twisted-printed-scarf-necklace-with-spiral-pendant-1789667845031-e61dff43.png": {
    name: "Twisted Scarf Necklace with Spiral Pendant",
    description:
      "Printed silk twisted into a soft collar and finished with a ridged gold-tone spiral pendant. The scarf carries turquoise, cream and deep brown together, so it sits as easily over linen in the afternoon as over black in the evening. Adjustable chain fastening.",
    priceCents: 249900,
    quantity: 6,
    category: "necklaces",
  },

  "1003768694-1789668031985-9efdfd97.png": {
    name: "Hammered Evil Eye Stud Earrings",
    description:
      "Square studs in hammered gold tone, each set with a hand-painted blue evil eye in white enamel. The beaten surface catches light unevenly, which keeps a small earring from reading flat. Light enough to wear from morning through dinner.",
    priceCents: 129900,
    quantity: 10,
    category: "earrings",
  },


  // ---- Earrings -----------------------------------------------------------

  "Pic-resize-Estailo-2023-04-24T160244.395.jpg.jpeg": {
    name: "Enamel Leaf Stud Earrings",
    description:
      "Two slender leaves per ear, one pearl-white and one storm grey, each rimmed in gold and painted with fine veining. The pair sits at an angle so it follows the line of the lobe rather than hanging from it.",
    priceCents: 119900,
    quantity: 12,
    createdDaysAgo: 48,
  },
  "Pic-resize-Estailo-9_1cbd9704-83d0-40b2-a4c4-ea50559ab283.jpg.jpeg": {
    name: "Triple Band Hoop Earrings",
    description:
      "Three polished gold-tone bands curving together into an open hoop. Solid enough to read across a room, light enough to forget you have them on. A quiet workhorse.",
    priceCents: 149900,
    compareAtCents: 189900,
    quantity: 9,
    isFeatured: true,
    createdDaysAgo: 4,
  },
  "Picresize-Estailo-2023-06-22T113053.970.jpg.jpeg": {
    name: "Tulip and Pearl Drop Earrings",
    description:
      "A blush enamel tulip on a pavé stem, with green leaves and a single round pearl swinging beneath. Detailed enough for a wedding, small enough for a lunch.",
    priceCents: 169900,
    quantity: 7,
    isFeatured: true,
    createdDaysAgo: 41,
  },
  "Picresize-Estailo-2023-06-23T122714.055-Copy.jpg.jpeg": {
    name: "Opal Cluster Huggie Earrings",
    description:
      "A slim gold huggie carrying a small cluster of milky opal droplets, each caught in a wire cage. They move as you do, which is what keeps a pale stone from going flat.",
    priceCents: 139900,
    quantity: 11,
    createdDaysAgo: 12,
  },
  "Picresize-Estailo-2023-06-23T124617.208_2ac0cc6c-8e08-486f-8f9e-57bd4d742077.jpg.jpeg": {
    name: "Iridescent Pearl Stud",
    description:
      "A single small pearl with a faint rainbow sheen, on a plain post. Made for a second piercing, or for days when jewellery should be barely there.",
    priceCents: 79900,
    quantity: 20,
    createdDaysAgo: 55,
  },
  "Picresize-Estailo_1080x1080px_-2024-03-03T214513.698_8bdfd822-066c-4236-a9b0-423aea6dde9a.jpg.jpeg": {
    name: "Sparkle Chain Drape Earrings",
    description:
      "A faceted silver-tone chain that drapes in a double loop from the lobe. There is no pendant and no stone — the cut of the links does all of it.",
    priceCents: 129900,
    quantity: 8,
    createdDaysAgo: 9,
  },
  "Picresize-Estailo_1080x1080px_-2024-03-22T214050.345_110c6e81-7239-4814-9ba3-3aaa825f41b0.jpg.jpeg": {
    name: "Organza Flower Stud Earrings",
    description:
      "A five-petal flower cut from black organza, gathered around a beaded centre. Soft and slightly translucent, so it reads as fabric rather than metal. Made in a small run.",
    priceCents: 99900,
    quantity: 5,
    isLimitedEdition: true,
    createdDaysAgo: 2,
  },
  "Untitleddesign_61_43bb127f-576e-4a5d-bbc1-8983ea104e98.jpg.jpeg": {
    name: "Disc Charm Huggie Earrings",
    description:
      "A gold-tone huggie hung with a row of small flat discs that catch the light at different angles as they swing. Enough movement to notice, not enough to jangle.",
    priceCents: 124900,
    quantity: 14,
    createdDaysAgo: 17,
  },

  // ---- Rings --------------------------------------------------------------

  "153_3.jpg.jpeg": {
    name: "Gold Wrap Ring",
    description:
      "An open band that wraps past itself, finishing in two smooth weighted teardrops. No stone, no engraving — it rests entirely on the shape and the polish. Adjusts slightly to fit.",
    priceCents: 159900,
    quantity: 10,
    isFeatured: true,
    createdDaysAgo: 6,
  },
  "Picresize-Estailo-2023-07-21T164308.366.jpg.jpeg": {
    name: "Pavé Butterfly Ring",
    description:
      "A silver-tone open band with a butterfly set in pavé stones on one wing and cut away on the other, finished with a single solitaire at the opposite end. Adjustable.",
    priceCents: 109900,
    quantity: 13,
    createdDaysAgo: 37,
  },

  "1003767958-1789668240768-ef116a18.png": {
    exclude: true,
    excludeReason:
      "The photograph shows a bracelet carrying the Louis Vuitton monogram and LV hardware. Listing it under the LavIndia name would be trademark use we have no right to, whether or not the piece is genuine. Left out deliberately — please confirm what this item actually is before it goes in the catalog.",
  },
};

/**
 * A name that is honestly a placeholder.
 *
 * These images are bulk-migrated files whose names carry no information
 * (`135_2bd87bbc…`), and nobody has looked at them. Numbering them plainly
 * makes it obvious in the admin which products still need a real name,
 * rather than dressing them up as finished listings.
 */
export function placeholderNameFor(category: CategorySlug, index: number): string {
  const singular: Record<CategorySlug, string> = {
    earrings: "Earrings",
    necklaces: "Necklace",
    rings: "Ring",
  };
  return `Untitled ${singular[category]} ${String(index).padStart(2, "0")}`;
}

/**
 * A plausible opening price per category, varied a little so the storefront's
 * price filters and budget tiers have a spread to work against. These are
 * placeholders for review, not researched prices.
 */
export function priceForCategory(category: CategorySlug, index: number): number {
  const bands: Record<CategorySlug, { base: number; step: number; span: number }> = {
    earrings: { base: 89900, step: 20000, span: 8 },
    necklaces: { base: 149900, step: 35000, span: 10 },
    rings: { base: 99900, step: 25000, span: 6 },
  };
  const band = bands[category];
  return band.base + band.step * (index % band.span);
}
