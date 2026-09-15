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

function generateBreadcrumbs(pathname: string) {
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
      const productSlug = segments[i + 1];
      // Convert slug to readable name (e.g., "gold-earrings" -> "Gold Earrings")
      const productName = productSlug
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

export function BreadcrumbNavigation() {
  const pathname = usePathname();
  const breadcrumbs = generateBreadcrumbs(pathname);

  // Don't show breadcrumbs on home page
  if (breadcrumbs.length <= 1) {
    return null;
  }

  return (
    <Breadcrumb>
      <BreadcrumbList className="text-sm">
        {breadcrumbs.map((crumb, index) => (
          <Fragment key={crumb.href}>
            {index > 0 && <BreadcrumbSeparator className="text-gray-400" />}
            <BreadcrumbItem>
              {index === breadcrumbs.length - 1 ? (
                <BreadcrumbPage className="text-gray-700 font-medium">
                  {crumb.label}
                </BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link
                    href={crumb.href}
                    className="text-gray-600 hover:text-amber-600 transition-colors underline-offset-4 hover:underline cursor-pointer"
                  >
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
