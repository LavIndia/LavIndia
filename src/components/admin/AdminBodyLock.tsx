"use client";

import { useEffect } from "react";

// Marks <html>/<body> as "admin-shell-active" for as long as an admin page
// is mounted (see the matching rule in src/app/globals.css) so the root
// document can never scroll behind the admin shell — even if a portaled
// overlay (a Select's dropdown, etc.) renders outside the shell's own
// overflow:hidden boundary and would otherwise inflate the page's scroll
// height. Removed on unmount so leaving /admin restores normal storefront
// scrolling immediately.
export function AdminBodyLock() {
  useEffect(() => {
    document.documentElement.classList.add("admin-shell-active");
    document.body.classList.add("admin-shell-active");

    return () => {
      document.documentElement.classList.remove("admin-shell-active");
      document.body.classList.remove("admin-shell-active");
    };
  }, []);

  return null;
}
