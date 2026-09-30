/**
 * In-app help for the admin portal — the "?" in the top bar.
 *
 * One entry per admin screen, written for the people who run the shop, not
 * for developers. Entries live in code beside the features so a change to a
 * screen ships with its help: a new or changed admin page is not finished
 * until its entry here says what it now does.
 */

export interface HelpItem {
  /** The field, button or idea, as it is labelled on screen. */
  term: string;
  /** What it means and when to use it, in plain words. */
  text: string;
}

export interface HelpSection {
  heading: string;
  items: HelpItem[];
}

export interface HelpEntry {
  /**
   * The admin route this entry explains, with [param] for dynamic parts:
   * "/admin/promotions/[id]". The most specific match wins.
   */
  route: string;
  /** Where it sits in the sidebar, for the Help index. */
  area: "Overview" | "Catalog" | "Inventory" | "Sales" | "Marketing & Content" | "System";
  title: string;
  /** One or two sentences: what this screen is for. */
  purpose: string;
  /** The usual job done here, step by step. */
  steps?: string[];
  /** What each part of the screen means. */
  sections?: HelpSection[];
  /** Things worth knowing — limits, edge cases, what happens automatically. */
  notes?: string[];
  related?: Array<{ label: string; href: string }>;
}
