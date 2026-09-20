"use client";

import { useCallback, useState } from "react";
import { useSearchParams } from "next/navigation";

/**
 * Keeps the profile page's open tab in the URL.
 *
 * The profile page holds five tabs, two of which — addresses and wishlist —
 * are linked to from the account menu and from /addresses and /wishlist.
 * Without this the link could only ever open the page on its first tab, so
 * those URLs had nowhere useful to point.
 *
 * The open tab is held in component state rather than read back out of the
 * URL on every render, and the URL is updated with `history.replaceState` so
 * that switching tabs neither pushes a history entry nor triggers a
 * navigation that would re-run the page's data loading.
 */

export const PROFILE_TABS = [
  "profile",
  "addresses",
  "orders",
  "wishlist",
  "security",
] as const;

export type ProfileTab = (typeof PROFILE_TABS)[number];

const DEFAULT_TAB: ProfileTab = "profile";

function isProfileTab(value: string | null): value is ProfileTab {
  return value !== null && PROFILE_TABS.includes(value as ProfileTab);
}

export function useProfileTab() {
  const searchParams = useSearchParams();
  const requested = searchParams.get("tab");

  // Read once, for the initial render: an unrecognised or absent ?tab simply
  // opens the first tab rather than showing an error.
  const [tab, setTab] = useState<ProfileTab>(
    isProfileTab(requested) ? requested : DEFAULT_TAB,
  );

  const selectTab = useCallback((next: string) => {
    if (!isProfileTab(next)) return;
    setTab(next);
    const url = next === DEFAULT_TAB ? "/profile" : `/profile?tab=${next}`;
    window.history.replaceState(null, "", url);
  }, []);

  return { tab, selectTab };
}
