"use client";

import { Fragment } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { css } from "styled-system/css";

const separatorStyle = css({ color: "fg.muted" });
const pageStyle = css({ color: "fg.default", fontWeight: "medium" });
const linkStyle = css({
  color: "fg.muted",
  transition: "color 0.15s ease",
  textUnderlineOffset: "4px",
  cursor: "pointer",
  "&:hover, &[data-hovered]": { color: "accent.pressed", textDecoration: "underline" },
});

// Route configuration for breadcrumbs
const ROUTE_CONFIG: Record<string, string> = {
  // Product categories
  earrings: "Earrings",
  necklaces: "Necklaces",
  rings: "Rings",
  bracelets: "Bracelets",
  bangles: "Bangles",
  pendants: "Pendants",

  // App routes
  checkout: "Checkout",
  cart: "Shopping Cart",
  about: "About Us",
  contact: "Contact Us",
  faq: "FAQ",
  shipping: "Shipping Info",
  returns: "Returns & Exchanges",

  // User account
  login: "Login",
  register: "Register",
  profile: "My Profile",
  orders: "My Orders",
  wishlist: "Wishlist",
  addresses: "Addresses",

  // Admin (if needed later)
  admin: "Admin",
  dashboard: "Dashboard",
  products: "Products",
  categories: "Categories",
};

function generateBreadcrumbs(pathname: string, currentLabel?: string) {
  // Always start with home
  const breadcrumbs = [{ label: "Home", href: "/" }];

  // Split pathname and filter out empty segments
  const segments = pathname.split("/").filter(Boolean);

  let currentPath = "";

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    currentPath += `/${segment}`;

    // Skip dynamic route segments (those in brackets or product slugs)
    if (segment.startsWith("[") && segment.endsWith("]")) {
      continue;
    }

    // Handle product route specially - skip 'product' and use next segment as product name
    if (segment === "product" && i + 1 < segments.length) {
      const productSegment = segments[i + 1];

      // The product route is addressed by id, not slug, so deriving a name
      // from the URL yields a title-cased database id. A caller that knows
      // the real name passes it instead; the slug fallback below only helps
      // on routes that genuinely carry a slug.
      const productName =
        currentLabel ??
        productSegment
          .replace(/-\d+$/, "")
          .split("-")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");

      breadcrumbs.push({
        label: productName,
        href: currentPath,
      });
      break; // Product route is terminal, no more segments
    }

    // Check if segment has a configured display name
    let label = ROUTE_CONFIG[segment];

    // If not configured, convert to readable format
    if (!label) {
      label = segment
        .replace(/-/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase());
    }

    breadcrumbs.push({
      label,
      href: currentPath,
    });
  }

  return breadcrumbs;
}

export function BreadcrumbNavigation({
  /** Overrides the final crumb, for routes whose URL carries an id rather than a readable slug. */
  currentLabel,
}: {
  currentLabel?: string;
} = {}) {
  const pathname = usePathname();
  const breadcrumbs = generateBreadcrumbs(pathname, currentLabel);

  // Don't show breadcrumbs on home page
  if (breadcrumbs.length <= 1) {
    return null;
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {breadcrumbs.map((crumb, index) => (
          <Fragment key={crumb.href}>
            {index > 0 && <BreadcrumbSeparator className={separatorStyle} />}
            <BreadcrumbItem>
              {index === breadcrumbs.length - 1 ? (
                <BreadcrumbPage className={pageStyle}>
                  {crumb.label}
                </BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link href={crumb.href} className={linkStyle}>
                    {crumb.label}
                  </Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
