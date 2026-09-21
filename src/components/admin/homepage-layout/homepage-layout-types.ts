/**
 * The shapes the homepage layout screen edits, declared apart from the table
 * and the row so both agree on them.
 */

/** A `homepage_sections` row while it is being edited, before saving. */
export interface EditableSection {
  id: string;
  name: string;
  title: string | null;
  isVisible: boolean;
  order: number;
}

/**
 * How many items each band would render right now, keyed by section name.
 * Counted from the homepage's own cached payload, so the screen costs no
 * extra queries. Bands with nothing to count (a banner strip, say) are
 * simply absent.
 */
export type SectionCounts = Record<
  string,
  {
    value: number;
    /** Singular and plural are both given: "category" does not take an -s. */
    noun: string;
    nounPlural: string;
  }
>;
