import type { ContentSection } from "@/modules/marketing";

/**
 * Translates between the stored shape of a page and the plain text an editor
 * actually types.
 *
 * Paragraphs are separated by a blank line, which is how anyone writing prose
 * already separates them, and list items by a single newline. Nothing here
 * invents structure the writer did not type: a blank box becomes an absent
 * field rather than an empty string, so the storefront can tell "no intro"
 * from "an intro that happens to be blank".
 */

/** A section as the form holds it while being edited. */
export interface SectionDraft {
  /** Stable across re-orders so React keeps input focus. */
  id: string;
  heading: string;
  bodyText: string;
  bulletsText: string;
}

export function paragraphsToText(paragraphs: string[] | undefined): string {
  return (paragraphs ?? []).join("\n\n");
}

export function textToParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

export function bulletsToText(bullets: string[] | undefined): string {
  return (bullets ?? []).join("\n");
}

export function textToBullets(text: string): string[] {
  return text
    .split("\n")
    .map((bullet) => bullet.trim())
    .filter(Boolean);
}

let draftCounter = 0;
function nextDraftId() {
  draftCounter += 1;
  return `section-${draftCounter}`;
}

export function toDrafts(sections: ContentSection[]): SectionDraft[] {
  return sections.map((section) => ({
    id: nextDraftId(),
    heading: section.heading,
    bodyText: paragraphsToText(section.body),
    bulletsText: bulletsToText(section.bullets),
  }));
}

export function emptyDraft(): SectionDraft {
  return { id: nextDraftId(), heading: "", bodyText: "", bulletsText: "" };
}

export function toSections(drafts: SectionDraft[]): ContentSection[] {
  return drafts.map((draft) => {
    const body = textToParagraphs(draft.bodyText);
    const bullets = textToBullets(draft.bulletsText);
    return {
      heading: draft.heading.trim(),
      ...(body.length ? { body } : {}),
      ...(bullets.length ? { bullets } : {}),
    };
  });
}
