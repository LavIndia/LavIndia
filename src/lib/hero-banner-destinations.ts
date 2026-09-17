import { readdir } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";

export type HeroBannerDestination = {
  value: string;
  label: string;
};

function labelFromSlug(slug: string) {
  return slug
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export async function getHeroBannerDestinations(): Promise<
  HeroBannerDestination[]
> {
  const shopPagesDirectory = path.join(process.cwd(), "src", "app", "shop-pages");
  const entries = await readdir(shopPagesDirectory, { withFileTypes: true });
  const pageDestinations = entries
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("["))
    .map((entry) => ({
      value: `/${entry.name}`,
      label: labelFromSlug(entry.name),
    }));

  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    select: { name: true, slug: true },
  });
  const categoryDestinations = categories.map((category) => ({
    value: `/${category.slug}`,
    label: category.name,
  }));

  const destinations = [
    { value: "/shop", label: "Shop all jewelry" },
    ...pageDestinations,
    ...categoryDestinations,
  ];

  return Array.from(
    new Map(
      destinations.map((destination) => [destination.value, destination]),
    ).values(),
  ).sort((first, second) => {
    if (first.value === "/shop") return -1;
    return first.label.localeCompare(second.label);
  });
}
