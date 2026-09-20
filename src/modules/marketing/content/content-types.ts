import { z } from "zod";

/**
 * The contract for the storefront's written pages — the story, the core
 * values, the FAQ and the four policies.
 *
 * Copy is held as data rather than as JSX so that a page is a document an
 * admin can edit, not a component only a developer can change, and so every
 * page renders with identical typography and spacing.
 */

/** A single run of copy under its own heading. */
export interface ContentSection {
  heading: string;
  /** Rendered as paragraphs, in order. */
  body?: string[];
  /** Rendered as a list beneath the paragraphs. */
  bullets?: string[];
}

export interface ContentPageCopy {
  /** Shown in the hero band, and used as the browser/document title. */
  title: string;
  /** One sentence beneath the title. The hero omits it entirely when absent. */
  intro?: string;
  /**
   * Rendered as "Last updated <value>". Policy pages carry one because a
   * reader needs to know which version they agreed to; editorial pages do not.
   */
  lastUpdated?: string;
  sections: ContentSection[];
}

/** One row of the admin's list of editable pages. */
export interface ContentPageSummary {
  slug: string;
  title: string;
  /** The public URL the page is served at. */
  href: string;
  isPublished: boolean;
  sectionCount: number;
  /** Null until an admin has saved the page at least once. */
  updatedAt: Date | null;
  /** False while the page is still showing its shipped draft. */
  isCustomised: boolean;
}

// ---------------------------------------------------------------------------
// Validation
//
// The sections column is JSON, so nothing in the database enforces its shape.
// Every write goes through this schema instead, which keeps a malformed save
// from reaching a column that the storefront then has to render.
// ---------------------------------------------------------------------------

const trimmedLines = z
  .array(z.string())
  .transform((lines) => lines.map((line) => line.trim()).filter(Boolean));

export const contentSectionSchema = z.object({
  heading: z.string().trim().min(1, "Every section needs a heading"),
  body: trimmedLines.optional(),
  bullets: trimmedLines.optional(),
});

export const contentPageInputSchema = z.object({
  title: z.string().trim().min(1, "A page needs a title"),
  intro: z.string().trim().optional(),
  lastUpdated: z.string().trim().optional(),
  isPublished: z.boolean(),
  sections: z.array(contentSectionSchema).min(1, "A page needs at least one section"),
});

export type ContentPageInput = z.infer<typeof contentPageInputSchema>;
