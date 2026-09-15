"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Package,
  FolderTree,
  ShoppingCart,
  Users,
  BarChart3,
  Settings,
  FileText,
  Image,
  Tag,
  Megaphone,
  DollarSign,
  LayoutGrid,
  ListFilter,
  Menu,
} from "lucide-react";
import { useSiteSettings } from "@/components/providers/SiteSettingsProvider";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

const navigation = [
  {
    name: "Dashboard",
    href: "/admin/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Products",
    href: "/admin/products",
    icon: Package,
  },
  {
    name: "Categories",
    href: "/admin/categories",
    icon: FolderTree,
  },
  {
    name: "Filters",
    href: "/admin/filters",
    icon: ListFilter,
  },
  {
    name: "Orders",
    href: "/admin/orders",
    icon: ShoppingCart,
  },
  {
    name: "Customers",
    href: "/admin/customers",
    icon: Users,
  },
  {
    name: "Hero Banners",
    href: "/admin/hero-banners",
    icon: Image,
  },
  {
    name: "Discounts",
    href: "/admin/discounts",
    icon: Tag,
  },
  {
    name: "Promo Banners",
    href: "/admin/promo-banners",
    icon: Megaphone,
  },
  {
    name: "Budget Tiers",
    href: "/admin/budget-tiers",
    icon: DollarSign,
  },
  {
    name: "Homepage Layout",
    href: "/admin/homepage-layout",
    icon: LayoutGrid,
  },
  {
    name: "Analytics",
    href: "/admin/analytics",
    icon: BarChart3,
  },
  {
    name: "Settings",
    href: "/admin/settings",
    icon: Settings,
  },
  {
    name: "Audit Logs",
    href: "/admin/audit-logs",
    icon: FileText,
  },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { businessName } = useSiteSettings();

  const renderNavigation = (mobile = false) =>
    navigation.map((item) => {
      const isActive =
        pathname === item.href || pathname.startsWith(item.href + "/");
      const Icon = item.icon;
      const link = (
        <Link
          key={item.name}
          href={item.href}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
            isActive
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          <Icon className="h-4 w-4" />
          <span>{item.name}</span>
        </Link>
      );

      return mobile ? (
        <SheetCloseLink key={item.name} href={item.href}>
          {link}
        </SheetCloseLink>
      ) : (
        link
      );
    });

  return (
    <>
      <aside className="hidden w-64 shrink-0 border-r bg-card md:block">
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center border-b px-6">
            <Link href="/admin/dashboard" className="flex items-center">
              <span className="text-xl font-bold tracking-tight text-primary">
                {businessName}
              </span>
              <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                Admin
              </span>
            </Link>
          </div>
          <nav className="flex-1 space-y-1 p-3">{renderNavigation()}</nav>
          <div className="border-t p-4">
            <Link
              href="/"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              Back to Store
            </Link>
          </div>
        </div>
      </aside>

      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="fixed left-4 top-3 z-50 md:hidden"
            aria-label="Open admin navigation"
          >
            <Menu className="h-4 w-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[280px] p-0">
          <SheetHeader className="border-b px-6 py-5 text-left">
            <SheetTitle className="text-primary">{businessName}</SheetTitle>
            <SheetDescription>Store administration</SheetDescription>
          </SheetHeader>
          <nav className="space-y-1 p-4">{renderNavigation(true)}</nav>
          <div className="absolute inset-x-4 bottom-5 border-t pt-4">
            <Link
              href="/"
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Back to Store
            </Link>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function SheetCloseLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <SheetClose asChild>
      <Link href={href}>{children}</Link>
    </SheetClose>
  );
}
