"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { BookOpen, Home, Menu as MenuIcon, MessageCircle, Sparkles, Store } from "lucide-react";
import { useSiteSettings } from "@/components/providers/SiteSettingsProvider";
import { css, cx } from "styled-system/css";

/**
 * The storefront's main menu.
 *
 * The header's left slot was an empty placeholder, which left a phone with
 * no route to anything but the logo and the cart — the category links live
 * in the desktop navigation, and that is hidden below `md`. This is that
 * route: one tap to the menu, one tap to anywhere.
 *
 * The categories are the admin's own navigation categories, read from the
 * settings context the root layout already provides, so the menu needs no
 * request of its own and never disagrees with the desktop navigation.
 *
 * Deliberately flat. Collapsing the categories behind a disclosure would
 * save a little height and cost a tap on the very thing most visitors came
 * for, so they are simply listed.
 */

const triggerStyle = css({ flexShrink: 0 });
const iconStyle = css({ height: "5", width: "5" });

const panelStyle = css({
  display: "flex",
  flexDirection: "column",
  height: "full",
  paddingBottom: "6",
});
const navStyle = css({
  display: "flex",
  flexDirection: "column",
  gap: "1",
  padding: "3",
  overflowY: "auto",
});
const itemStyle = css({
  display: "flex",
  alignItems: "center",
  gap: "3",
  borderRadius: "lg",
  paddingInline: "3",
  paddingBlock: "2.5",
  fontSize: "md",
  fontWeight: "medium",
  color: "fg.default",
  transition: "background 0.15s ease, color 0.15s ease",
  "&:hover": { background: "bg.canvas", color: "accent.pressed" },
});
const activeItemStyle = css({
  background: "gold.50",
  color: "accent.pressed",
});
const itemIconStyle = css({ height: "4.5", width: "4.5", color: "accent.default", flexShrink: 0 });
const groupLabelStyle = css({
  paddingInline: "3",
  paddingTop: "4",
  paddingBottom: "1",
  fontSize: "xs",
  fontWeight: "semibold",
  letterSpacing: "wider",
  textTransform: "uppercase",
  color: "fg.subtle",
});
const categoryItemStyle = css({
  display: "block",
  borderRadius: "lg",
  paddingInline: "3",
  paddingBlock: "2.5",
  fontSize: "sm",
  color: "fg.muted",
  transition: "background 0.15s ease, color 0.15s ease",
  "&:hover": { background: "bg.canvas", color: "fg.default" },
});

/** Everything the menu offers, apart from the admin's own categories. */
const PRIMARY_LINKS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/shop", label: "All Categories", icon: Store },
  { href: "/new-arrivals", label: "New Arrivals", icon: Sparkles },
];

const SECONDARY_LINKS = [
  { href: "/story", label: "About", icon: BookOpen },
  { href: "/contact", label: "Contact Us", icon: MessageCircle },
];

export function Menu() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { navCategories, businessName } = useSiteSettings();

  const renderLink = (
    { href, label, icon: Icon }: { href: string; label: string; icon: typeof Home },
  ) => (
    <SheetClose asChild key={href}>
      <Link
        href={href}
        className={cx(itemStyle, pathname === href && activeItemStyle)}
        aria-current={pathname === href ? "page" : undefined}
      >
        <Icon className={itemIconStyle} />
        {label}
      </Link>
    </SheetClose>
  );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className={triggerStyle} aria-label="Open menu">
          <MenuIcon className={iconStyle} />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className={css({ width: "18rem", padding: "0" })}>
        <div className={panelStyle}>
          <SheetHeader
            className={css({
              borderBottom: "1px solid",
              borderColor: "border.subtle",
              paddingInline: "6",
              paddingBlock: "5",
              textAlign: "left",
            })}
          >
            <SheetTitle>{businessName}</SheetTitle>
          </SheetHeader>

          <nav className={navStyle}>
            {PRIMARY_LINKS.map(renderLink)}

            {navCategories.length > 0 && (
              <>
                <p className={groupLabelStyle}>Shop by category</p>
                {navCategories.map((category) => (
                  <SheetClose asChild key={category.id}>
                    <Link href={`/${category.slug}`} className={categoryItemStyle}>
                      {category.name}
                    </Link>
                  </SheetClose>
                ))}
              </>
            )}

            <p className={groupLabelStyle}>More</p>
            {SECONDARY_LINKS.map(renderLink)}
          </nav>
        </div>
      </SheetContent>
    </Sheet>
  );
}
