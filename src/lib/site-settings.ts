import { cache } from "react";
import { prisma } from "@/lib/prisma";

export const getSiteSettings = cache(async () => {
  const settings = await prisma.siteSettings.findFirst();

  if (settings) return settings;

  return {
    businessName: "lavindia",
    copyrightText: "© 2025 lavindia. All rights reserved.",
    metaTitle: null as string | null,
    metaDescription: null as string | null,
  };
});
