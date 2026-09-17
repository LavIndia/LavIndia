"use client";

import Link from "next/link";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";
import { useSiteSettings } from "@/components/providers/SiteSettingsProvider";
import { css, cx } from "styled-system/css";

const listStyle = css({ display: "flex", gap: "8" });

const linkStyle = css({
  position: "relative",
  fontFamily: "body",
  fontSize: "sm",
  fontWeight: "medium",
  letterSpacing: "wide",
  color: "fg.muted",
  paddingBlock: "1",
  transition: "color 0.2s ease",
  "&::after": {
    content: "''",
    position: "absolute",
    left: "0",
    right: "0",
    bottom: "-2px",
    height: "1px",
    background: "accent.default",
    transform: "scaleX(0)",
    transformOrigin: "center",
    transition: "transform 0.2s ease",
  },
  "&:hover, &[data-hovered]": { color: "fg.default" },
  "&:hover::after, &[data-hovered]::after": { transform: "scaleX(1)" },
});

export function Navigation() {
  // Featured categories are fetched once, server-side, in the root layout
  // and handed down via context — so every admin-created category marked
  // "Show in navigation" appears here without a per-page client fetch.
  const { navCategories } = useSiteSettings();

  return (
    <NavigationMenu>
      <NavigationMenuList className={listStyle}>
        {navCategories.map((category) => (
          <NavigationMenuItem key={category.id}>
            <NavigationMenuLink asChild>
              <Link href={`/${category.slug}`} className={cx(linkStyle, "linkHover")}>
                {category.name}
              </Link>
            </NavigationMenuLink>
          </NavigationMenuItem>
        ))}
      </NavigationMenuList>
    </NavigationMenu>
  );
}
