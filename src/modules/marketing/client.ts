/**
 * Marketing module — the browser-safe entry point.
 *
 * Mirrors the catalog module's split: anything a client component needs is
 * re-exported here, and this file must never reach a database import, so a
 * "use client" file can read the module without pulling Prisma into the
 * browser bundle. Server code keeps importing from "@/modules/marketing".
 */
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
export type {
  HighlightView,
  HighlightInput,
  HighlightMediaType,
} from "@/modules/marketing/highlights/highlight-types";
export {
  HIGHLIGHT_KINDS,
  HIGHLIGHT_MEDIA_TYPES,
  highlightInputSchema,
} from "@/modules/marketing/highlights/highlight-types";
