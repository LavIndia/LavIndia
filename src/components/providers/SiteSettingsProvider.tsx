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
  amazonLink: string | null;
  flipkartLink: string | null;
  myntraLink: string | null;
  blinkitLink: string | null;
  zeptoLink: string | null;
  /**
   * What cash on delivery costs the customer, in paise.
   *
   * Carried in the shared settings rather than fetched at checkout so the
   * order summary can show the charge the moment the customer picks cash,
   * with no request in the middle of a purchase.
   */
  codFeeCents: number;
}

const SiteSettingsContext = createContext<SiteSettingsValue>({
  businessName: "lavindia",
  copyrightText: "© 2025 lavindia. All rights reserved.",
  navCategories: [],
  contactNumber: null,
  contactEmail: null,
  address: null,
  gstNumber: null,
  amazonLink: null,
  flipkartLink: null,
  myntraLink: null,
  blinkitLink: null,
  zeptoLink: null,
  codFeeCents: 0,
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
