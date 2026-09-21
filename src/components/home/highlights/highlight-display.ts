import type { HighlightView } from "@/modules/marketing/client";

/**
 * How a highlight reads on screen.
 *
 * Kept apart from the card so the card, the lightbox and anything added
 * later word a highlight identically — and so the one piece of logic worth
 * testing here, the date formatting, is not buried in markup.
 */

/**
 * "March 2026" rather than a full date: a highlight is remembered by the
 * month it happened in, and an exact day adds noise to a card.
 */
export function formatHappenedOn(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

/**
 * The line beneath the title: where it happened and when, joined only when
 * both are known, and omitted entirely when neither is — a label with
 * nothing behind it is never shown.
 */
export function highlightMeta(highlight: HighlightView): string | null {
  const when = formatHappenedOn(highlight.happenedOn);
  const parts = [highlight.place, when].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : null;
}
