import { cache } from "react";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

// Prisma call is memoized within a request via React's cache(), and cached
// across requests/navigations via Next's unstable_cache() so that
// src/app/layout.tsx (which wraps every route) doesn't hit the database on
// every single navigation. Admin updates to site settings call
// revalidateTag("site-settings") to bust this cache immediately.
const getCachedSiteSettings = unstable_cache(
  async () => {
    const settings = await prisma.siteSettings.findFirst();
    return settings;
  },
  ["site-settings"],
  { tags: ["site-settings"], revalidate: 300 }
);

export const getSiteSettings = cache(async () => {
  const settings = await getCachedSiteSettings();

  if (settings) return settings;

  return {
    businessName: "lavindia",
    copyrightText: "© 2025 lavindia. All rights reserved.",
    metaTitle: null as string | null,
    metaDescription: null as string | null,
    contactNumber: null as string | null,
    email: null as string | null,
    address: null as string | null,
    gstNumber: null as string | null,
  };
});
