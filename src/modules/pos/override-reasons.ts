/**
 * Why a price was changed by hand at the counter.
 *
 * A curated list rather than free text, so the concessions stay groupable —
 * "how much did we give away on damaged pieces this quarter" is only
 * answerable if damage is its own reason rather than a note somebody typed.
 * "Other" stays available, but only with a note saying what it was.
 *
 * Stored on the order line as one string (`OrderItem.overrideReason`): the
 * curated reason itself, or `Other — <note>`. Pure — no Prisma, no React — so
 * the counter screen and the sale API apply exactly the same rule.
 */

export const OVERRIDE_REASONS = [
  "Damaged piece",
  "Loyal client",
  "Manager approval",
  "Price match",
  "Other",
] as const;

export type OverrideReasonChoice = (typeof OVERRIDE_REASONS)[number];

const OTHER = "Other";
const OTHER_PREFIX = `${OTHER} — `;

/** The longest reason the sale API accepts, note included. */
export const OVERRIDE_REASON_MAX = 200;

/** A chosen reason and its note → the one string stored on the line. */
export function composeOverrideReason(choice: string, note = ""): string {
  if (choice !== OTHER) return choice;
  return note ? `${OTHER_PREFIX}${note}` : OTHER;
}

/**
 * A stored reason → the choice and note the form shows.
 *
 * A reason typed before the list existed reads as "Other" with that text as
 * its note, so nothing already written is lost.
 */
export function parseOverrideReason(reason: string | undefined | null): {
  choice: OverrideReasonChoice | "";
  note: string;
} {
  if (!reason) return { choice: "", note: "" };
  if (reason === OTHER) return { choice: OTHER, note: "" };
  if (reason.startsWith(OTHER_PREFIX)) {
    return { choice: OTHER, note: reason.slice(OTHER_PREFIX.length) };
  }
  if ((OVERRIDE_REASONS as readonly string[]).includes(reason)) {
    return { choice: reason as OverrideReasonChoice, note: "" };
  }
  return { choice: OTHER, note: reason };
}

/**
 * True when the reason explains the change: a curated reason, or "Other"
 * with a note. A bare "Other" says nothing and is refused.
 */
export function isCompleteOverrideReason(reason: string | undefined | null): boolean {
  const trimmed = reason?.trim() ?? "";
  if (!trimmed || trimmed.length > OVERRIDE_REASON_MAX) return false;
  const { choice, note } = parseOverrideReason(trimmed);
  if (!choice) return false;
  return choice !== OTHER || note.trim().length > 0;
}
