/**
 * Calendar boundaries in India time, whatever the server's clock zone.
 *
 * "Today" and "this month" for the shop mean Asia/Kolkata. A server in UTC
 * would otherwise start the day at 5:30 am and put the first hours of every
 * month in the month before. India has no daylight saving, so a fixed offset
 * is exact.
 */
export const IST_OFFSET_MINUTES = 330;
const OFFSET_MS = IST_OFFSET_MINUTES * 60_000;
const DAY_MS = 86_400_000;
// Spelled out rather than taken from Intl, whose short names vary by runtime
// ("Sep" in one, "Sept" in another).
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** The India-time calendar fields of an instant. */
function istParts(at: Date) {
  const shifted = new Date(at.getTime() + OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
  };
}

/** The instant an India-time calendar date begins. */
function istMidnight(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month, day) - OFFSET_MS);
}

/** Midnight India time at the start of the day `at` falls in. */
export function istStartOfDay(at: Date): Date {
  const { year, month, day } = istParts(at);
  return istMidnight(year, month, day);
}

/** Midnight India time `days` before the start of today. */
export function istDaysAgo(at: Date, days: number): Date {
  return new Date(istStartOfDay(at).getTime() - days * DAY_MS);
}

/** Midnight India time on the 1st of the month `at` falls in. */
export function istStartOfMonth(at: Date): Date {
  const { year, month } = istParts(at);
  return istMidnight(year, month, 1);
}

/**
 * Midnight India time on 1 April of the financial year `at` falls in.
 *
 * India's financial year runs April–March, so 31 March 23:59 belongs to the
 * year that began the April before, and 1 April 00:00 starts a new one.
 */
export function istFinancialYearStart(at: Date): Date {
  const { year, month } = istParts(at);
  return istMidnight(month >= 3 ? year : year - 1, 3, 1);
}

/** `YYYY-MM-DD` of an instant in India time. */
export function istDateKey(at: Date): string {
  return new Date(at.getTime() + OFFSET_MS).toISOString().slice(0, 10);
}

export interface MonthComparison {
  /** Start of this month — the month so far runs from here to `now`. */
  currentFrom: Date;
  /** The same stretch of last month: its first day to the same point. */
  previousFrom: Date;
  previousTo: Date;
  /** Last month's stretch in words, e.g. "1–14 Sep". */
  previousLabel: string;
}

/**
 * This month so far against the same days of last month.
 *
 * A month in progress compared with a whole month is always "down"; the
 * honest comparison is like with like — 1–14 October against 1–14 September.
 * When last month was shorter (31 March against February) its stretch stops
 * at the end of that month rather than spilling into this one.
 */
export function monthToDateComparison(now: Date = new Date()): MonthComparison {
  const { year, month } = istParts(now);
  const currentFrom = istMidnight(year, month, 1);
  const previousFrom = istMidnight(year, month - 1, 1);
  const elapsed = now.getTime() - currentFrom.getTime();
  const previousTo = new Date(Math.min(previousFrom.getTime() + elapsed, currentFrom.getTime()));

  const monthName = MONTHS[(month + 11) % 12];
  const lastDay =
    previousTo > previousFrom ? istParts(new Date(previousTo.getTime() - 1)).day : 1;
  const previousLabel = lastDay <= 1 ? `1 ${monthName}` : `1–${lastDay} ${monthName}`;

  return { currentFrom, previousFrom, previousTo, previousLabel };
}

/**
 * Percentage change, or null when there is nothing to compare against —
 * growth from zero is not a percentage, and printing "0%" would hide it.
 */
export function percentChange(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return ((current - previous) / previous) * 100;
}
