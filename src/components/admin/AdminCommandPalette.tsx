"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  FolderTree,
  ShoppingCart,
  Users,
  BarChart3,
  Settings,
  FileText,
  Image as ImageIcon,
  Tag,
  Megaphone,
  DollarSign,
  LayoutGrid,
  ListFilter,
  PlusCircle,
  Search,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { css, cx } from "styled-system/css";

type Command = {
  id: string;
  label: string;
  hint?: string;
  href: string;
  icon: typeof LayoutDashboard;
  keywords?: string;
};

const DESTINATIONS: Command[] = [
  { id: "dashboard", label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { id: "analytics", label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
  { id: "products", label: "Products", href: "/admin/products", icon: Package },
  { id: "categories", label: "Categories", href: "/admin/categories", icon: FolderTree },
  { id: "filters", label: "Filters", href: "/admin/filters", icon: ListFilter },
  { id: "budget-tiers", label: "Budget Tiers", href: "/admin/budget-tiers", icon: DollarSign },
  { id: "orders", label: "Orders", href: "/admin/orders", icon: ShoppingCart },
  { id: "customers", label: "Customers", href: "/admin/customers", icon: Users },
  { id: "discounts", label: "Discounts", href: "/admin/discounts", icon: Tag },
  { id: "hero-banners", label: "Hero Banners", href: "/admin/hero-banners", icon: ImageIcon },
  { id: "promo-banners", label: "Promo Banners", href: "/admin/promo-banners", icon: Megaphone },
  { id: "homepage-layout", label: "Homepage Layout", href: "/admin/homepage-layout", icon: LayoutGrid },
  { id: "content-pages", label: "Page Content", href: "/admin/content-pages", icon: FileText },
  { id: "settings", label: "Settings", href: "/admin/settings", icon: Settings },
  { id: "audit-logs", label: "Audit Logs", href: "/admin/audit-logs", icon: FileText },
];

const ACTIONS: Command[] = [
  { id: "new-product", label: "New Product", hint: "Create", href: "/admin/products/new", icon: PlusCircle },
  { id: "new-discount", label: "New Discount", hint: "Create", href: "/admin/discounts/new", icon: PlusCircle },
  { id: "new-hero-banner", label: "New Hero Banner", hint: "Create", href: "/admin/hero-banners/new", icon: PlusCircle },
  { id: "new-promo-banner", label: "New Promo Banner", hint: "Create", href: "/admin/promo-banners/new", icon: PlusCircle },
  { id: "bulk-upload", label: "Bulk Upload Products", hint: "Create", href: "/admin/products/bulk-upload", icon: PlusCircle },
];

const ALL_COMMANDS = [...ACTIONS, ...DESTINATIONS];

const inputWrapStyle = css({ position: "relative" });
const inputIconStyle = css({ position: "absolute", left: "3.5", top: "50%", transform: "translateY(-50%)", color: "fg.muted", pointerEvents: "none" });
const listStyle = css({ marginTop: "3", maxHeight: "20rem", overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.5" });
const emptyStyle = css({ padding: "6", textAlign: "center", fontSize: "sm", color: "fg.muted" });

const itemStyle = (active: boolean) =>
  css({
    display: "flex",
    alignItems: "center",
    gap: "3",
    width: "full",
    borderRadius: "md",
    paddingInline: "3",
    paddingBlock: "2.5",
    fontSize: "sm",
    fontWeight: "medium",
    textAlign: "left",
    cursor: "pointer",
    color: "fg.default",
    background: active ? "gold.50" : "transparent",
    "& svg": { color: active ? "accent.pressed" : "fg.muted", flexShrink: "0" },
  });

const hintStyle = css({ marginLeft: "auto", fontSize: "xs", color: "fg.muted" });
const kbdHintStyle = css({
  fontSize: "xs",
  color: "fg.muted",
  borderTop: "1px solid",
  borderColor: "border.subtle",
  marginTop: "3",
  paddingTop: "3",
  display: "flex",
  gap: "4",
});

export function AdminCommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    function onOpenRequest() {
      setOpen(true);
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("admin:open-command-palette", onOpenRequest);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("admin:open-command-palette", onOpenRequest);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ALL_COMMANDS;
    return ALL_COMMANDS.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.keywords?.toLowerCase().includes(q)
    );
  }, [query]);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        showCloseButton={false}
        className={css({ maxWidth: "34rem", padding: "4" })}
      >
        <div className={inputWrapStyle}>
          <Search className={inputIconStyle} size={16} />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={(e: React.KeyboardEvent) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActiveIndex((i) => Math.min(i + 1, results.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActiveIndex((i) => Math.max(i - 1, 0));
              } else if (e.key === "Enter" && results[activeIndex]) {
                e.preventDefault();
                go(results[activeIndex].href);
              }
            }}
            placeholder="Jump to a section or action…"
            className={css({ paddingLeft: "10" })}
          />
        </div>
        <div className={listStyle}>
          {results.length === 0 && <div className={emptyStyle}>No matches</div>}
          {results.map((cmd, i) => {
            const Icon = cmd.icon;
            return (
              <button
                key={cmd.id}
                type="button"
                className={itemStyle(i === activeIndex)}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => go(cmd.href)}
              >
                <Icon size={16} />
                <span>{cmd.label}</span>
                {cmd.hint && <span className={hintStyle}>{cmd.hint}</span>}
              </button>
            );
          })}
        </div>
        <div className={kbdHintStyle}>
          <span>↑↓ navigate</span>
          <span>↵ open</span>
          <span>esc close</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
