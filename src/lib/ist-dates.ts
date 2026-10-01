/**
 * India Standard Time for admin-entered dates.
 *
 * The shop runs in India, so a date an admin picks ("from 5 Oct to 7 Oct")
 * means those days in IST — whatever timezone the server or the admin's
 * browser happens to be in. `new Date("2026-10-05")` reads a bare date as
 * UTC midnight, which is 05:30 in India: a window entered that way opened
 * five and a half hours late and closed at dawn on its last day, and showing
 * it back with `toISOString()` could land on the neighbouring day.
 *
 * Pure and dependency-free, so the admin forms and the API routes share it.
 * IST has no daylight saving, so a fixed +05:30 offset is exact.
 */

export const IST_TIME_ZONE = "Asia/Kolkata";
const IST_OFFSET = "+05:30";
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
// A datetime-local value: no zone, so it is read as IST.
const ZONELESS_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?$/;

export type DateEdge = "start" | "end";

/**
 * Turns what an admin form sends into the instant to store.
 *
 * - "" / null / undefined → null (no bound)
 * - "YYYY-MM-DD" → the first moment of that IST day for a start, the last
 *   for an end, so the end date is included in the window
 * - "YYYY-MM-DDTHH:mm" (no zone) → that IST wall-clock time
 * - an ISO string with a zone → that exact instant
 *
 * Throws a RangeError for anything that is not a date.
 */
export function parseAdminDate(value: unknown, edge: DateEdge): Date | null {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) return value;
  if (typeof value !== "string") throw new RangeError("Not a date");

  const text = value.trim();
  if (!text) return null;

  let iso = text;
  if (DATE_ONLY.test(text)) {
    iso = `${text}T${edge === "start" ? "00:00:00.000" : "23:59:59.999"}${IST_OFFSET}`;
  } else if (ZONELESS_DATE_TIME.test(text)) {
    iso = `${text.length === 16 ? `${text}:00` : text}${IST_OFFSET}`;
  }

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) throw new RangeError(`Not a date: ${text}`);
  return date;
}

function toInstant(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** The IST calendar day of an instant, as a `<input type="date">` value. */
export function toIstDateInput(value: Date | string | null | undefined): string {
  const date = toInstant(value);
  if (!date) return "";
  return new Date(date.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/**
 * A local Date carrying the IST calendar day of an instant, for handing to a
 * date formatter that works in the viewer's own timezone (date-fns
 * `format`). Only the day is meaningful — use it for "MMM d"-style labels.
 */
export function istCalendarDay(value: Date | string | null | undefined): Date | null {
  const day = toIstDateInput(value);
  if (!day) return null;
  const [year, month, date] = day.split("-").map(Number);
  return new Date(year, month - 1, date);
}
