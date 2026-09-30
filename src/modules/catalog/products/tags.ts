/**
 * Product tags, normalised so two spellings never become two tags:
 * "Festive Edit", "festive_edit" and " festive-edit " are all
 * "festive-edit". Shown to the admin with the dashes as spaces.
 */
export function normaliseTag(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

export function normaliseTags(raw: readonly string[]): string[] {
  return [...new Set(raw.map(normaliseTag).filter(Boolean))].sort();
}

/** "festive-edit" → "Festive edit". */
export function tagLabel(tag: string): string {
  const words = tag.replace(/-/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}
