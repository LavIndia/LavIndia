/**
 * Every admin help entry, and the lookup from a screen's address to its help.
 */
import type { HelpEntry } from "./types";
import { OVERVIEW_HELP } from "./overview";
import { CATALOG_HELP } from "./catalog";
import { INVENTORY_HELP } from "./inventory";
import { SALES_HELP } from "./sales";
import { CUSTOMERS_HELP } from "./customers";
import { MARKETING_HELP } from "./marketing";
import { OFFERS_HELP } from "./offers";
import { SYSTEM_HELP } from "./system";
import { HELP_PAGE_HELP } from "./help-page";

export type { HelpEntry, HelpItem, HelpSection } from "./types";

export const ADMIN_HELP: HelpEntry[] = [
  ...OVERVIEW_HELP,
  ...CATALOG_HELP,
  ...INVENTORY_HELP,
  ...SALES_HELP,
  ...CUSTOMERS_HELP,
  ...OFFERS_HELP,
  ...MARKETING_HELP,
  ...SYSTEM_HELP,
  ...HELP_PAGE_HELP,
];

export const HELP_AREAS: HelpEntry["area"][] = [
  "Overview",
  "Catalog",
  "Inventory",
  "Sales",
  "Marketing & Content",
  "System",
];

function toPattern(route: string): RegExp {
  const escaped = route
    .split("/")
    .map((part) => (part.startsWith("[") ? "[^/]+" : part.replace(/[.*+?^${}()|\\]/g, "\\$&")))
    .join("/");
  return new RegExp(`^${escaped}/?$`);
}

/** Literal segments beat [params], so /promotions/sets wins over /promotions/[id]. */
function specificity(route: string): number {
  return route.split("/").reduce((score, part) => score + (part.startsWith("[") ? 1 : 3), 0);
}

export function helpFor(pathname: string): HelpEntry | null {
  const matches = ADMIN_HELP.filter((entry) => toPattern(entry.route).test(pathname));
  if (matches.length === 0) return null;
  return matches.sort((a, b) => specificity(b.route) - specificity(a.route))[0];
}
