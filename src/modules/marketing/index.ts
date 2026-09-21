/**
 * Marketing module — the merchandising and editorial surfaces.
 *
 * The single entry point other code imports from, so the module's internals
 * can be rearranged (or lifted out into a service of its own) without every
 * call site changing.
 */
export type {
  ContentSection,
  ContentPageCopy,
  ContentPageSummary,
  ContentPageInput,
} from "@/modules/marketing/content/content-types";
export {
  contentPageInputSchema,
  contentSectionSchema,
} from "@/modules/marketing/content/content-types";
export {
  CONTENT_PAGE_SLUGS,
  isContentPageSlug,
  contentPageDefault,
} from "@/modules/marketing/content/content-defaults";
export {
  getContentPage,
  getContentPageForEditing,
  listContentPages,
  saveContentPage,
} from "@/modules/marketing/content/content-service";
export type {
  HomePageSectionName,
  HomePageSectionDescriptor,
} from "@/modules/marketing/homepage/homepage-sections";
export {
  HOMEPAGE_SECTIONS,
  HOMEPAGE_SECTION_NAMES,
  NEW_ARRIVAL_WINDOW_DAYS,
  homePageSectionDescriptor,
  defaultHomePageSectionRows,
} from "@/modules/marketing/homepage/homepage-sections";
