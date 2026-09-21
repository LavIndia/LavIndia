/**
 * The catalogue of homepage sections.
 *
 * One list, in one place, describing every band the homepage can render:
 * what it is called in the database, what an admin should see it called,
 * what fills it, and where an admin goes to change what fills it.
 *
 * Both sides read from here. `getHomePageSections` seeds the table from this
 * catalogue on first run, the homepage maps each stored row to a renderer by
 * `name`, and the admin layout screen shows the label and the explanation
 * instead of the raw `new_arrivals`-style key. Adding a section is therefore
 * one entry here plus one renderer, rather than a string repeated in four
 * files that drift apart.
 *
 * Pure data with no database import, so the admin's client component can
 * read it directly.
 */

/** The stored `homepage_sections.name` values, in their shipped order. */
export const HOMEPAGE_SECTION_NAMES = [
  "hero",
  "explore",
  "bestsellers",
  "budget",
  "free_gifts",
  "new_arrivals",
  "highlights",
  "trust_badges",
  "coupons",
] as const;

export type HomePageSectionName = (typeof HOMEPAGE_SECTION_NAMES)[number];

export interface HomePageSectionDescriptor {
  name: HomePageSectionName;
  /** What an admin sees instead of the stored key. */
  label: string;
  /** The heading the storefront uses when no custom title is set. */
  defaultTitle: string;
  /** Where the content in this band comes from, in an admin's words. */
  source: string;
  /** The admin screen that changes what this band shows, if there is one. */
  managedAt: string | null;
}

/**
 * How many days a product counts as newly arrived for. Shared so that the
 * query and the sentence shown to an admin can never disagree.
 */
export const NEW_ARRIVAL_WINDOW_DAYS = 30;

export const HOMEPAGE_SECTIONS: HomePageSectionDescriptor[] = [
  {
    name: "hero",
    label: "Hero Banner",
    defaultTitle: "Hero Banner",
    source: "The active hero banners, in their set order.",
    managedAt: "/admin/hero-banners",
  },
  {
    name: "explore",
    label: "Explore Collections",
    defaultTitle: "Explore Collections",
    source: "Categories marked as featured, in their featured order.",
    managedAt: "/admin/categories",
  },
  {
    name: "bestsellers",
    label: "Bestsellers",
    defaultTitle: "Bestsellers",
    source:
      "Products ranked by units actually sold. Until there are orders, the newest products stand in and the Bestseller tag is withheld.",
    managedAt: "/admin/products",
  },
  {
    name: "budget",
    label: "Shop Under Budget",
    defaultTitle: "Shop Under Budget",
    source: "The active budget tiers.",
    managedAt: "/admin/budget-tiers",
  },
  {
    name: "free_gifts",
    label: "Free Gifts Banner",
    defaultTitle: "Free Gifts",
    source: "The first active promo banner of type Free Gifts.",
    managedAt: "/admin/promo-banners",
  },
  {
    name: "new_arrivals",
    label: "New Arrivals",
    defaultTitle: "You Blink, You Miss",
    source: `Published products added in the last ${NEW_ARRIVAL_WINDOW_DAYS} days, newest first. Nothing to tick — publishing a product puts it here, and it leaves on its own.`,
    managedAt: "/admin/products",
  },
  {
    name: "highlights",
    label: "Highlights",
    defaultTitle: "LavIndia Highlights",
    source:
      "The house's own moments — expos, pop-ups, awards and press — that are marked active, in their set order.",
    managedAt: "/admin/highlights",
  },
  {
    name: "trust_badges",
    label: "Trust Badges",
    defaultTitle: "Trust Badges",
    source:
      "Store settings: cash on delivery, customer count, rating and support hours.",
    managedAt: "/admin/settings",
  },
  {
    name: "coupons",
    label: "Coupons",
    defaultTitle: "Offers For You",
    source: "Discount codes that are active and within their dates.",
    managedAt: "/admin/discounts",
  },
];

const BY_NAME = new Map<string, HomePageSectionDescriptor>(
  HOMEPAGE_SECTIONS.map((section) => [section.name, section]),
);

/**
 * The descriptor for a stored row. Returns a readable stand-in rather than
 * nothing for a row whose section has since been removed from the code, so
 * the admin table never renders a blank line it cannot explain.
 */
export function homePageSectionDescriptor(
  name: string,
): HomePageSectionDescriptor {
  const known = BY_NAME.get(name);
  if (known) return known;

  const label = name
    .split(/[_-]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
  return {
    name: name as HomePageSectionName,
    label,
    defaultTitle: label,
    source: "This section is stored but is no longer built by the storefront.",
    managedAt: null,
  };
}

/** The rows to seed `homepage_sections` with when it is still empty. */
export function defaultHomePageSectionRows() {
  return HOMEPAGE_SECTIONS.map((section, order) => ({
    name: section.name,
    order,
    isVisible: true,
  }));
}
