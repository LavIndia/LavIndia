import { prisma } from "@/lib/prisma";
import { isScheduledActive, type RecurrenceParams } from "@/lib/scheduling";

/**
 * Banners for the storefront, and the one rule for whether a banner is live.
 *
 * The homepage is cached as a unit, so the queries here deliberately do NOT
 * filter by time: they return every switched-on banner with its schedule,
 * and `liveBanners` decides what is showing *after* the cache. Filtering
 * inside the cache would freeze a schedule for as long as the cache lives —
 * a 6pm-9pm banner fetched at 5:59 would miss its window. The schedule
 * itself is the shared one in `@/lib/scheduling` (IST), the same check
 * offers, coupons and the promo banner API use.
 */

type ScheduledRow = Omit<RecurrenceParams, "isRecurring"> & {
  isRecurring: boolean;
  // Dates arrive as strings once a row has been through the data cache.
  startDate: Date | string | null;
  endDate: Date | string | null;
};

function toDate(value: Date | string | null): Date | null {
  if (!value) return null;
  return value instanceof Date ? value : new Date(value);
}

/** Is this banner showing at `now`? `isActive` is its on/off switch. */
export function isBannerLive(row: ScheduledRow, isActive: boolean, now: Date): boolean {
  return isScheduledActive(
    { ...row, isActive, startDate: toDate(row.startDate), endDate: toDate(row.endDate) },
    now,
  );
}

/** The hero banners that are switched on and inside their schedule now. */
export function liveHeroBanners<T extends ScheduledRow & { active: boolean }>(
  rows: T[],
  now: Date = new Date(),
): T[] {
  return rows.filter((row) => isBannerLive(row, row.active, now));
}

/** The promo banners that are switched on and inside their schedule now. */
export function livePromoBanners<T extends ScheduledRow & { isActive: boolean }>(
  rows: T[],
  now: Date = new Date(),
): T[] {
  return rows.filter((row) => isBannerLive(row, row.isActive, now));
}

/** Every switched-on hero banner, schedule included; see `liveHeroBanners`. */
export function getEnabledHeroBanners() {
  return prisma.heroBanner.findMany({
    where: { active: true },
    orderBy: { order: "asc" },
  });
}

/** Every switched-on promo banner of a type, schedule included. */
export function getEnabledPromoBanners(type: string) {
  return prisma.promoBanner.findMany({
    where: { isActive: true, type },
    orderBy: { order: "asc" },
  });
}

/** The promo banners of a type showing right now (uncached callers). */
export async function getPromoBanners(type: string) {
  return livePromoBanners(await getEnabledPromoBanners(type));
}
