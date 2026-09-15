"use client";

import { createContext, useContext } from "react";

interface SiteSettingsValue {
  businessName: string;
  copyrightText: string;
}

const SiteSettingsContext = createContext<SiteSettingsValue>({
  businessName: "lavindia",
  copyrightText: "© 2025 lavindia. All rights reserved.",
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
