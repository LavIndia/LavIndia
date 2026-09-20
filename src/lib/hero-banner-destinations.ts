import { prisma } from "@/lib/prisma";

/**
 * The curated list of places a hero banner is allowed to send a visitor.
 *
 * Offering a fixed list rather than a free-text field is what stops a banner
 * being pointed at a URL that does not exist. The fixed part of the list is
 * declared here rather than discovered from the filesystem: the previous
 * version read the `src/app/shop-pages` directory at request time, which
 * worked locally but not once deployed, because a serverless bundle does not
 * ship the application's source tree. It also listed any directory it found,
 * including ones whose public URL is produced by a rewrite that may not
 * exist.
 *
 * Every entry below must have a matching route or rewrite in
 * `next.config.ts`. Categories are read from the database because an admin
 * creates those, and `src/app/[category]/page.tsx` serves each one directly.
 */

export type HeroBannerDestination = {
  value: string;
  label: string;
};

const SHOP_DESTINATIONS: HeroBannerDestination[] = [
  { value: "/shop", label: "Shop all jewellery" },
  { value: "/new-arrivals", label: "New Arrivals" },
  { value: "/bestsellers", label: "Bestsellers" },
  { value: "/budget", label: "Shop by Budget" },
];

const SHOP_ALL = SHOP_DESTINATIONS[0].value;

export async function getHeroBannerDestinations(): Promise<
  HeroBannerDestination[]
> {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    select: { name: true, slug: true },
  });

  const categoryDestinations = categories.map((category) => ({
    value: `/${category.slug}`,
    label: category.name,
  }));

  const destinations = [...SHOP_DESTINATIONS, ...categoryDestinations];

  // A category slug could collide with one of the fixed entries, so the later
  // duplicate is dropped and the curated label wins.
  return Array.from(
    new Map(
      destinations.map((destination) => [destination.value, destination]),
    ).values(),
  ).sort((first, second) => {
    // "Shop all" stays at the top; everything else is alphabetical.
    if (first.value === SHOP_ALL) return -1;
    if (second.value === SHOP_ALL) return 1;
    return first.label.localeCompare(second.label);
  });
}
