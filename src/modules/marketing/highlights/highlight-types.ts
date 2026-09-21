import { z } from "zod";

/**
 * The contract for highlights — the house's own moments rather than its
 * pieces: an expo stand, a pop-up counter, an award, a press mention.
 *
 * Media-typed from the outset. Only images are shown today, but the card,
 * the admin form and the storage all treat the medium as a property of the
 * highlight, so adding film later is a new branch in one component rather
 * than a second parallel feature.
 *
 * Free of LavIndia specifics: nothing here knows about jewellery, so the
 * module travels with the rest of marketing.
 */

export const HIGHLIGHT_MEDIA_TYPES = ["IMAGE", "VIDEO"] as const;
export type HighlightMediaType = (typeof HIGHLIGHT_MEDIA_TYPES)[number];

/**
 * The tags offered before free text, in the spirit of the catalogue's other
 * curated lists: an admin picks rather than invents, so twenty highlights do
 * not end up with twenty spellings of "exhibition".
 */
export const HIGHLIGHT_KINDS = [
  "Expo",
  "Exhibition",
  "Pop-up",
  "Award",
  "Press",
  "Milestone",
  "Collaboration",
] as const;

/** A highlight as any screen needs it. Dates are ISO strings across the wire. */
export interface HighlightView {
  id: string;
  title: string;
  description: string | null;
  place: string | null;
  happenedOn: string | null;
  kind: string | null;
  mediaType: HighlightMediaType;
  mediaUrl: string;
  posterUrl: string | null;
  linkUrl: string | null;
  order: number;
  isActive: boolean;
}

/**
 * What an admin may send. `mediaUrl` is the one thing a highlight cannot do
 * without — a card with no picture is a blank rectangle — so it is the only
 * required field besides the title.
 */
export const highlightInputSchema = z.object({
  title: z.string().trim().min(1, "A title is required"),
  description: z.string().trim().max(600).nullable().optional(),
  place: z.string().trim().max(200).nullable().optional(),
  // Accepts an empty string from a date input and reads it as "not set".
  happenedOn: z
    .union([z.string().trim(), z.null()])
    .optional()
    .transform((value) => (value ? value : null)),
  kind: z.string().trim().max(60).nullable().optional(),
  mediaType: z.enum(HIGHLIGHT_MEDIA_TYPES).default("IMAGE"),
  mediaUrl: z.string().trim().min(1, "An image is required"),
  posterUrl: z.string().trim().nullable().optional(),
  linkUrl: z.string().trim().max(500).nullable().optional(),
  order: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export type HighlightInput = z.infer<typeof highlightInputSchema>;
