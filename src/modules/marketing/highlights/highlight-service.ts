import { unstable_cache, revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import {
  type HighlightInput,
  type HighlightMediaType,
  type HighlightView,
} from "@/modules/marketing/highlights/highlight-types";

/**
 * Reading and writing highlights.
 *
 * The storefront's read is cached under its own tag rather than the
 * homepage's, so an admin editing a highlight refreshes this band without
 * rebuilding every other one; the homepage tag is dropped alongside it
 * because the homepage payload carries highlights too.
 */

const HIGHLIGHTS_TAG = "highlights";

type HighlightRow = Prisma.HighlightGetPayload<object>;

function toView(row: HighlightRow): HighlightView {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    place: row.place,
    // Serialised here so a server component can hand it to a client one.
    happenedOn: row.happenedOn ? row.happenedOn.toISOString() : null,
    kind: row.kind,
    mediaType: row.mediaType as HighlightMediaType,
    mediaUrl: row.mediaUrl,
    posterUrl: row.posterUrl,
    linkUrl: row.linkUrl,
    order: row.order,
    isActive: row.isActive,
  };
}

/** What the storefront shows: active highlights, in the admin's order. */
export async function getActiveHighlights(): Promise<HighlightView[]> {
  const cached = unstable_cache(
    async () =>
      (
        await prisma.highlight.findMany({
          where: { isActive: true },
          orderBy: [{ order: "asc" }, { createdAt: "desc" }],
        })
      ).map(toView),
    ["active-highlights"],
    { tags: [HIGHLIGHTS_TAG, "homepage"], revalidate: 300 },
  );
  return cached();
}

/** Every highlight, active or not, for the admin list. */
export async function listHighlights(): Promise<HighlightView[]> {
  const rows = await prisma.highlight.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
  });
  return rows.map(toView);
}

export async function getHighlight(id: string): Promise<HighlightView | null> {
  const row = await prisma.highlight.findUnique({ where: { id } });
  return row ? toView(row) : null;
}

function toRow(input: HighlightInput) {
  return {
    title: input.title,
    description: input.description || null,
    place: input.place || null,
    happenedOn: input.happenedOn ? new Date(input.happenedOn) : null,
    kind: input.kind || null,
    mediaType: input.mediaType,
    mediaUrl: input.mediaUrl,
    posterUrl: input.posterUrl || null,
    linkUrl: input.linkUrl || null,
    order: input.order,
    isActive: input.isActive,
  };
}

function dropCaches() {
  revalidateTag(HIGHLIGHTS_TAG);
  revalidateTag("homepage");
}

export async function createHighlight(input: HighlightInput) {
  const row = await prisma.highlight.create({ data: toRow(input) });
  dropCaches();
  return toView(row);
}

export async function updateHighlight(id: string, input: HighlightInput) {
  const row = await prisma.highlight.update({ where: { id }, data: toRow(input) });
  dropCaches();
  return toView(row);
}

export async function deleteHighlight(id: string) {
  await prisma.highlight.delete({ where: { id } });
  dropCaches();
}

export { HIGHLIGHTS_TAG };
