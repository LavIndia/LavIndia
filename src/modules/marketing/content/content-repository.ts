import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { ContentPageInput } from "@/modules/marketing/content/content-types";

/**
 * Data access for the storefront's written pages.
 *
 * Kept apart from the service so that the service reads as the rules — which
 * page wins, published or not — and this file holds the only knowledge of how
 * a page is stored.
 */

export type ContentPageRow = {
  slug: string;
  title: string;
  intro: string | null;
  lastUpdated: string | null;
  sections: Prisma.JsonValue;
  isPublished: boolean;
  updatedAt: Date;
  updatedById: string | null;
};

export function findContentPage(slug: string): Promise<ContentPageRow | null> {
  return prisma.contentPage.findUnique({ where: { slug } });
}

export function findContentPages(slugs: string[]): Promise<ContentPageRow[]> {
  return prisma.contentPage.findMany({ where: { slug: { in: slugs } } });
}

export function upsertContentPage(
  slug: string,
  input: ContentPageInput,
  updatedById: string | null,
): Promise<ContentPageRow> {
  const fields = {
    title: input.title,
    // An empty box means "no intro", not the empty string: the storefront
    // hides the line entirely when there is nothing to show.
    intro: input.intro || null,
    lastUpdated: input.lastUpdated || null,
    sections: input.sections as unknown as Prisma.InputJsonValue,
    isPublished: input.isPublished,
    updatedById,
  };

  return prisma.contentPage.upsert({
    where: { slug },
    create: { slug, ...fields },
    update: fields,
  });
}

export function deleteContentPage(slug: string): Promise<ContentPageRow> {
  return prisma.contentPage.delete({ where: { slug } });
}
