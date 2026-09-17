"use client";

import { createContext, useContext } from "react";

interface NavCategory {
  id: string;
  name: string;
  slug: string;
}

interface SiteSettingsValue {
  businessName: string;
  copyrightText: string;
  // Featured categories fetched once server-side in the root layout, so
  // client components like the header nav can list them without each page
  // re-fetching the same data.
  navCategories: NavCategory[];
  contactNumber: string | null;
  contactEmail: string | null;
  address: string | null;
  gstNumber: string | null;
}

const SiteSettingsContext = createContext<SiteSettingsValue>({
  businessName: "lavindia",
  copyrightText: "© 2025 lavindia. All rights reserved.",
  navCategories: [],
  contactNumber: null,
  contactEmail: null,
  address: null,
  gstNumber: null,
});

export function SiteSettingsProvider({
  value,
  children,
}: {
  value: SiteSettingsValue;
  children: React.ReactNode;
}) {
  return (
    <SiteSettingsContext.Provider value={value}>
      {children}
    </SiteSettingsContext.Provider>
  );
}

export function useSiteSettings() {
  return useContext(SiteSettingsContext);
}
