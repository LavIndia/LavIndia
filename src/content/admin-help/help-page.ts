import type { HelpEntry } from "./types";

/** Help about the help itself. */
export const HELP_PAGE_HELP: HelpEntry[] = [
  {
    route: "/admin/help",
    area: "System",
    title: "Help",
    purpose: "What each admin page is for and how to use it, grouped as the sidebar is.",
    steps: ["Type a word in the search box — retire, GST, codes, stock.", "Open a page's entry to read it."],
    notes: ["On any page, the ? in the top bar opens the help for that page."],
  },
];
