import * as React from "react";
import { css, cx } from "styled-system/css";

/**
 * Simplified from the original Radix NavigationMenu: the only real call site
 * (`components/layout/Navigation.tsx`) renders a flat row of category links
 * with no dropdown/flyout content, so this is plain accessible `<nav>`/`<ul>`
 * markup rather than forcing React Aria's menu/overlay machinery onto a
 * non-menu use case (golden rule 2 — plain semantic HTML for static content).
 */

function NavigationMenu({ className, children, ...props }: React.ComponentProps<"nav">) {
  return (
    <nav
      data-slot="navigation-menu"
      className={cx(
        css({ position: "relative", display: "flex", maxWidth: "max-content", flex: "1", alignItems: "center", justifyContent: "center" }),
        className
      )}
      {...props}
    >
      {children}
    </nav>
  );
}

function NavigationMenuList({ className, ...props }: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="navigation-menu-list"
      className={cx(
        css({ display: "flex", flex: "1", listStyle: "none", alignItems: "center", justifyContent: "center", gap: "1", margin: "0", padding: "0" }),
        className
      )}
      {...props}
    />
  );
}

function NavigationMenuItem({ className, ...props }: React.ComponentProps<"li">) {
  return (
    <li
      data-slot="navigation-menu-item"
      className={cx(css({ position: "relative" }), className)}
      {...props}
    />
  );
}

export interface NavigationMenuLinkProps extends React.ComponentProps<"a"> {
  /** Render styling onto the single child element instead of an <a> (e.g. wrapping a Next.js <Link>). */
  asChild?: boolean;
}

function NavigationMenuLink({ className, asChild, children, ...props }: NavigationMenuLinkProps) {
  const classes = cx(
    css({
      display: "flex",
      flexDirection: "column",
      gap: "1",
      borderRadius: "md",
      padding: "2",
      fontSize: "sm",
      fontFamily: "body",
      color: "fg.default",
      textDecoration: "none",
      outline: "none",
      transition: "background 0.15s ease, color 0.15s ease",
      "&:hover, &[data-hovered]": { background: "bg.surface" },
      "&:focus-visible, &[data-focus-visible]": { boxShadow: "0 0 0 3px token(colors.gold.200)" },
      "&[data-active=true]": { background: "bg.surface", color: "accent.pressed" },
    }),
    className
  );

  if (asChild) {
    const child = React.Children.only(children) as React.ReactElement<{ className?: string }>;
    return React.cloneElement(child, { className: cx(classes, child.props.className) });
  }

  return (
    <a data-slot="navigation-menu-link" className={classes} {...props}>
      {children}
    </a>
  );
}

export { NavigationMenu, NavigationMenuList, NavigationMenuItem, NavigationMenuLink };
