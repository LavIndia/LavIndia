import { unstable_cache, revalidateTag } from "next/cache";
import {
  CONTENT_PAGE_SLUGS,
  contentPageDefault,
  isContentPageSlug,
} from "@/modules/marketing/content/content-defaults";
import {
  findContentPage,
  findContentPages,
  upsertContentPage,
  type ContentPageRow,
} from "@/modules/marketing/content/content-repository";
import {
  contentPageInputSchema,
  type ContentPageCopy,
  type ContentPageInput,
  type ContentPageSummary,
  type ContentSection,
} from "@/modules/marketing/content/content-types";

/**
 * Reads and writes the storefront's written pages.
 *
 * The rule the whole feature turns on: a stored page wins, and the draft that
 * ships with the code is the fallback. That keeps a page rendering on a
 * database nobody has edited yet, and means an admin's save is an override
 * rather than the only copy in existence.
 */

const CONTENT_TAG = "content-pages";

function sectionsFromRow(row: ContentPageRow): ContentSection[] {
  // The column is JSON, so it is validated on the way out as well as in:
  // a row written before a shape change must not be able to crash a page.
  const parsed = contentPageInputSchema.shape.sections.safeParse(row.sections);
  return parsed.success ? parsed.data : [];
}

function copyFromRow(row: ContentPageRow): ContentPageCopy {
  return {
    title: row.title,
    intro: row.intro ?? undefined,
    lastUpdated: row.lastUpdated ?? undefined,
    sections: sectionsFromRow(row),
  };
}

async function loadContentPage(slug: string): Promise<ContentPageCopy | null> {
  const fallback = contentPageDefault(slug);
  if (!fallback) return null;

  const row = await findContentPage(slug);

  // An unpublished page, or one whose stored sections no longer parse, falls
  // back to the shipped draft rather than showing the visitor nothing.
  if (!row || !row.isPublished) return fallback;

  const copy = copyFromRow(row);
  return copy.sections.length > 0 ? copy : fallback;
}

/**
 * The copy for one page, as the storefront should render it.
 *
 * Cached across requests and navigations under a single tag that every save
 * busts, so a published change appears immediately rather than after the
 * revalidate window.
 */
export async function getContentPage(
  slug: string,
): Promise<ContentPageCopy | null> {
  if (!isContentPageSlug(slug)) return null;

  const cached = unstable_cache(
    () => loadContentPage(slug),
    ["content-page", slug],
    { tags: [CONTENT_TAG], revalidate: 300 },
  );
  return cached();
}

/** Every editable page, for the admin list. */
export async function listContentPages(): Promise<ContentPageSummary[]> {
  const rows = await findContentPages(CONTENT_PAGE_SLUGS);
  const bySlug = new Map(rows.map((row) => [row.slug, row]));

  return CONTENT_PAGE_SLUGS.map((slug) => {
    const row = bySlug.get(slug);
    const fallback = contentPageDefault(slug);

    return {
      slug,
      href: `/${slug}`,
      title: row?.title ?? fallback?.title ?? slug,
      isPublished: row?.isPublished ?? true,
      sectionCount: row
        ? sectionsFromRow(row).length
        : (fallback?.sections.length ?? 0),
      updatedAt: row?.updatedAt ?? null,
      isCustomised: Boolean(row),
    };
  });
}

/**
 * The copy an admin should see in the editor: the stored version if there is
 * one, otherwise the shipped draft so they start from real words rather than
 * an empty form.
 */
export async function getContentPageForEditing(
  slug: string,
): Promise<(ContentPageCopy & { isPublished: boolean }) | null> {
  if (!isContentPageSlug(slug)) return null;

  const row = await findContentPage(slug);
  if (row) {
    const copy = copyFromRow(row);
    return {
      ...copy,
      sections: copy.sections.length > 0 ? copy.sections : (contentPageDefault(slug)?.sections ?? []),
      isPublished: row.isPublished,
    };
  }

  const fallback = contentPageDefault(slug);
  return fallback ? { ...fallback, isPublished: true } : null;
}

export async function saveContentPage(
  slug: string,
  input: ContentPageInput,
  updatedById: string | null,
): Promise<void> {
  if (!isContentPageSlug(slug)) {
    throw new Error(`"${slug}" is not an editable page`);
  }

  await upsertContentPage(slug, input, updatedById);
  revalidateTag(CONTENT_TAG);
}

export { CONTENT_TAG };
