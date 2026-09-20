"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  FolderTree,
  ShoppingCart,
  Users,
  UserCheck,
  BarChart3,
  Settings,
  FileText,
  Image,
  Images,
  Tag,
  Megaphone,
  DollarSign,
  LayoutGrid,
  ListFilter,
  Menu,
  ChevronDown,
  Store,
  Boxes,
  PackagePlus,
  SlidersHorizontal,
  History,
  ScanLine,
} from "lucide-react";
import { useSiteSettings } from "@/components/providers/SiteSettingsProvider";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { css, cx } from "styled-system/css";

type NavItem = { name: string; href: string; icon: typeof LayoutDashboard };
type NavGroup = { label: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
      { name: "Analytics", href: "/admin/analytics", icon: BarChart3 },
    ],
  },
  {
    label: "Catalog",
    items: [
      { name: "Products", href: "/admin/products", icon: Package },
      { name: "Categories", href: "/admin/categories", icon: FolderTree },
      { name: "Filters", href: "/admin/filters", icon: ListFilter },
      { name: "Budget Tiers", href: "/admin/budget-tiers", icon: DollarSign },
    ],
  },
  {
    label: "Inventory",
    items: [
      { name: "Stock", href: "/admin/inventory/stock", icon: Boxes },
      { name: "Receive Stock", href: "/admin/inventory/receive", icon: PackagePlus },
      { name: "Adjustments", href: "/admin/inventory/adjustments", icon: SlidersHorizontal },
      { name: "Movements", href: "/admin/inventory/movements", icon: History },
      { name: "Barcodes", href: "/admin/inventory/barcodes", icon: ScanLine },
    ],
  },
  {
    label: "Sales",
    items: [
      { name: "Store POS", href: "/admin/pos", icon: Store },
      // One Orders screen covers BOTH channels, filtered by channel — a
      // separate "Online Orders" entry implied counter sales lived elsewhere.
      { name: "Orders", href: "/admin/orders", icon: ShoppingCart },
      { name: "Sales Insights", href: "/admin/sales-insights", icon: BarChart3 },
      { name: "Customers", href: "/admin/customers", icon: Users },
      // Segmentation sits beside the customer list rather than under
      // analytics: it is a list of people to act on, not a report to read.
      { name: "Customer Segments", href: "/admin/customers/rfm", icon: UserCheck },
    ],
  },
  {
    label: "Marketing & Content",
    items: [
      { name: "Discounts", href: "/admin/discounts", icon: Tag },
      { name: "Hero Banners", href: "/admin/hero-banners", icon: Image },
      { name: "Login Screen Images", href: "/admin/auth-images", icon: Images },
      { name: "Promo Banners", href: "/admin/promo-banners", icon: Megaphone },
      { name: "Homepage Layout", href: "/admin/homepage-layout", icon: LayoutGrid },
      // The written pages - story, FAQ and the policies. Grouped here
      // because they are content an admin edits, not a system setting.
      { name: "Page Content", href: "/admin/content-pages", icon: FileText },
    ],
  },
  {
    label: "System",
    items: [
      { name: "Settings", href: "/admin/settings", icon: Settings },
      { name: "Audit Logs", href: "/admin/audit-logs", icon: FileText },
    ],
  },
];

const asideStyle = css({
  display: { base: "none", md: "flex" },
  width: "64",
  flexShrink: "0",
  flexDirection: "column",
  height: "full",
  background: "bg.glassStrong",
  backdropBlur: "glass",
  borderRight: "1px solid",
  borderColor: "border.subtle",
});

const brandRowStyle = css({
  display: "flex",
  alignItems: "center",
  height: "16",
  paddingInline: "6",
  borderBottom: "1px solid",
  borderColor: "border.subtle",
  gap: "2",
});

const brandNameStyle = css({
  fontFamily: "display",
  fontSize: "lg",
  fontWeight: "semibold",
  color: "fg.default",
});

const brandBadgeStyle = css({
  borderRadius: "full",
  background: "linear-gradient(135deg, {colors.gold.300}, {colors.gold.500})",
  color: "fg.onGold",
  fontSize: "10px",
  fontWeight: "semibold",
  paddingInline: "2",
  paddingBlock: "0.5",
  letterSpacing: "wide",
  textTransform: "uppercase",
});

const navScrollStyle = css({ flex: "1", overflowY: "auto", padding: "3", display: "flex", flexDirection: "column", gap: "1" });

const groupHeaderStyle = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  width: "full",
  paddingInline: "3",
  paddingBlock: "2",
  cursor: "pointer",
  borderRadius: "sm",
  fontSize: "xs",
  fontWeight: "semibold",
  letterSpacing: "wide",
  textTransform: "uppercase",
  color: "fg.muted",
  "&:hover": { color: "fg.default" },
});

const chevronStyle = (open: boolean) =>
  css({
    height: "3.5",
    width: "3.5",
    transition: "transform 0.18s ease",
    transform: open ? "rotate(0deg)" : "rotate(-90deg)",
  });

const groupBodyStyle = (open: boolean) =>
  css({
    display: "grid",
    gridTemplateRows: open ? "1fr" : "0fr",
    transition: "grid-template-rows 0.2s ease",
    overflow: "hidden",
  });

const groupBodyInnerStyle = css({ overflow: "hidden", display: "flex", flexDirection: "column", gap: "0.5", paddingBottom: "1" });

const linkStyle = (active: boolean) =>
  css({
    display: "flex",
    alignItems: "center",
    gap: "3",
    borderRadius: "md",
    paddingInline: "3",
    paddingBlock: "2",
    fontSize: "sm",
    fontWeight: "medium",
    color: active ? "accent.pressed" : "fg.muted",
    background: active ? "gold.50" : "transparent",
    transition: "background 0.15s ease, color 0.15s ease",
    "&:hover": { background: active ? "gold.50" : "bg.surface", color: active ? "accent.pressed" : "fg.default" },
  });

const footerStyle = css({ borderTop: "1px solid", borderColor: "border.subtle", padding: "4" });
const backLinkStyle = css({
  fontSize: "sm",
  fontWeight: "medium",
  color: "fg.muted",
  "&:hover": { color: "fg.default" },
});

const mobileTriggerStyle = css({ position: "fixed", left: "4", top: "3", zIndex: "50", md: { display: "none" } });

function groupIsActive(group: NavGroup, pathname: string) {
  return group.items.some((item) => pathname === item.href || pathname.startsWith(item.href + "/"));
}

function NavGroupBlock({
  group,
  pathname,
  onNavigate,
}: {
  group: NavGroup;
  pathname: string;
  onNavigate?: () => void;
}) {
  const [open, setOpen] = useState(() => groupIsActive(group, pathname));

  return (
    <div>
      <button type="button" className={groupHeaderStyle} onClick={() => setOpen((v) => !v)}>
        <span>{group.label}</span>
        <ChevronDown className={chevronStyle(open)} />
      </button>
      <div className={groupBodyStyle(open)}>
        <div className={groupBodyInnerStyle}>
          {group.items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link key={item.name} href={item.href} className={linkStyle(active)} onClick={onNavigate}>
                <Icon className={css({ height: "4", width: "4", flexShrink: "0" })} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function AdminSidebar() {
  const pathname = usePathname();
  const { businessName } = useSiteSettings();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <aside className={asideStyle}>
        <div className={brandRowStyle}>
          <Link href="/admin/dashboard" className={cx(css({ display: "flex", alignItems: "center", gap: "2" }))}>
            <span className={brandNameStyle}>{businessName}</span>
            <span className={brandBadgeStyle}>Admin</span>
          </Link>
        </div>
        <nav className={navScrollStyle}>
          {NAV_GROUPS.map((group) => (
            <NavGroupBlock key={group.label} group={group} pathname={pathname} />
          ))}
        </nav>
        <div className={footerStyle}>
          <Link href="/" className={backLinkStyle}>
            ← Back to Store
          </Link>
        </div>
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <Button
            variant="glass"
            size="icon"
            className={mobileTriggerStyle}
            aria-label="Open admin navigation"
          >
            <Menu className={css({ height: "4", width: "4" })} />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className={css({ width: "18rem", padding: "0" })}>
          <div className={css({ padding: "0" })}>
            <SheetHeader className={css({ borderBottom: "1px solid", borderColor: "border.subtle", paddingInline: "6", paddingBlock: "5", textAlign: "left" })}>
              <SheetTitle>{businessName}</SheetTitle>
              <SheetDescription>Store administration</SheetDescription>
            </SheetHeader>
            <nav className={css({ padding: "4", display: "flex", flexDirection: "column", gap: "1" })}>
              {NAV_GROUPS.map((group) => (
                <SheetGroupBlock key={group.label} group={group} pathname={pathname} />
              ))}
            </nav>
            <div className={css({ paddingInline: "6", paddingBottom: "5" })}>
              <SheetClose asChild>
                <Link href="/" className={backLinkStyle}>
                  ← Back to Store
                </Link>
              </SheetClose>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function SheetGroupBlock({ group, pathname }: { group: NavGroup; pathname: string }) {
  const [open, setOpen] = useState(() => groupIsActive(group, pathname));
  return (
    <div>
      <button type="button" className={groupHeaderStyle} onClick={() => setOpen((v) => !v)}>
        <span>{group.label}</span>
        <ChevronDown className={chevronStyle(open)} />
      </button>
      <div className={groupBodyStyle(open)}>
        <div className={groupBodyInnerStyle}>
          {group.items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <SheetClose asChild key={item.name}>
                <Link href={item.href} className={linkStyle(active)}>
                  <Icon className={css({ height: "4", width: "4", flexShrink: "0" })} />
                  <span>{item.name}</span>
                </Link>
              </SheetClose>
            );
          })}
        </div>
      </div>
    </div>
  );
}
