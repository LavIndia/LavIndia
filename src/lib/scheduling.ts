// Shared "is this active right now" logic for anything with an optional
// date window plus an optional recurring schedule within it — currently
// used by Discount, HeroBanner, and PromoBanner. Field names differ
// slightly across those models (e.g. HeroBanner uses `active`, others use
// `isActive`), so this takes plain values rather than a shared type.

// The business operates in India (IST, UTC+5:30, no DST) — recurrence
// rules like "every Friday" or "6pm-9pm" are meant in local business time.
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
function toIST(date: Date) {
  return new Date(date.getTime() + IST_OFFSET_MS);
}

export type RecurrenceParams = {
  isRecurring: boolean;
  recurrenceType?: string | null;
  recurrenceDaysOfWeek?: number[];
  recurrenceDayOfMonth?: number | null;
  recurrenceStartTime?: string | null;
  recurrenceEndTime?: string | null;
};

export function isWithinRecurrence(params: RecurrenceParams, now: Date): boolean {
  if (!params.isRecurring) return true;

  const ist = toIST(now);

  if (params.recurrenceStartTime && params.recurrenceEndTime) {
    const nowMinutes = ist.getUTCHours() * 60 + ist.getUTCMinutes();
    const [startH, startM] = params.recurrenceStartTime.split(":").map(Number);
    const [endH, endM] = params.recurrenceEndTime.split(":").map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    const inWindow =
      startMinutes <= endMinutes
        ? nowMinutes >= startMinutes && nowMinutes <= endMinutes
        : nowMinutes >= startMinutes || nowMinutes <= endMinutes; // spans midnight

    if (!inWindow) return false;
  }

  switch (params.recurrenceType) {
    case "WEEKLY":
      return (params.recurrenceDaysOfWeek ?? []).includes(ist.getUTCDay());
    case "MONTHLY":
      return params.recurrenceDayOfMonth === ist.getUTCDate();
    case "DAILY":
    default:
      return true;
  }
}

export type SchedulableParams = RecurrenceParams & {
  isActive: boolean;
  startDate?: Date | null;
  endDate?: Date | null;
};

export function isScheduledActive(
  params: SchedulableParams,
  now: Date = new Date(),
): boolean {
  if (!params.isActive) return false;
  if (params.startDate && now < params.startDate) return false;
  if (params.endDate && now > params.endDate) return false;
  return isWithinRecurrence(params, now);
}
