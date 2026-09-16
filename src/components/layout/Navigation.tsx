import Link from "next/link";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";
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

// Static — this is fixed top-level navigation for the three collections
// featured site-wide. It previously round-tripped to /api/categories/featured
// on every single page load just to re-render the same three links; that was
// pure waste (an extra request + client JS + a loading flash for content that
// never actually changed), so this is now a plain server component with zero
// client-side fetch. If featured categories ever need to be truly dynamic
// here, thread them down as a prop from a server-rendered parent instead of
// re-introducing a client fetch.
const CATEGORIES = [
  { id: "earrings", name: "Earrings", slug: "earrings" },
  { id: "necklaces", name: "Necklaces", slug: "necklaces" },
  { id: "rings", name: "Rings", slug: "rings" },
];

export function Navigation() {
  return (
    <NavigationMenu>
      <NavigationMenuList className={listStyle}>
        {CATEGORIES.map((category) => (
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
