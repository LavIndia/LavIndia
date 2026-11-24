"use client";

/**
 * Small pieces every GST screen shares, so they look like one product and
 * follow the admin's ivory-and-gold look rather than each inventing a style.
 */
import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { css, cx } from "styled-system/css";
import { Badge } from "@/components/ui/badge";

const TABS: Array<{ href: string; label: string }> = [
  { href: "/admin/gst", label: "Overview" },
  { href: "/admin/gst/business", label: "Registration" },
  { href: "/admin/gst/classification", label: "Classification" },
  { href: "/admin/gst/rates", label: "Rates & codes" },
  { href: "/admin/gst/monitoring", label: "Calculations" },
  { href: "/admin/gst/invoices", label: "Invoices" },
  { href: "/admin/gst/reports", label: "Reports" },
  { href: "/admin/gst/updates", label: "Updates" },
];

const navStyle = css({ display: "flex", gap: "1", overflowX: "auto", borderBottom: "1px solid", borderColor: "border.subtle", paddingBottom: "0", marginBottom: "1" });
const tabStyle = css({ paddingInline: "3", paddingBlock: "2", fontSize: "sm", whiteSpace: "nowrap", color: "fg.muted", borderBottom: "2px solid transparent", marginBottom: "-1px", _hover: { color: "fg.default" } });
const activeTab = css({ color: "fg.default", fontWeight: "semibold", borderBottomColor: "gold.500" });

/** The strip of GST screens, shown at the top of each. */
export function GstNav() {
  const pathname = usePathname();
  return (
    <nav className={navStyle} aria-label="GST sections">
      {TABS.map((tab) => {
        const active = tab.href === "/admin/gst" ? pathname === tab.href : pathname.startsWith(tab.href);
        return (
          <Link key={tab.href} href={tab.href} className={cx(tabStyle, active && activeTab)}>
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

const cardStyle = css({ border: "1px solid", borderColor: "border.subtle", borderRadius: "xl", background: "bg.surface", padding: { base: "4", md: "5" }, display: "flex", flexDirection: "column", gap: "3", minWidth: 0 });
const headStyle = css({ fontFamily: "display", fontSize: "lg", fontWeight: "semibold", color: "fg.default" });
const hintStyle = css({ fontSize: "sm", color: "fg.muted", lineHeight: "relaxed" });

export function Section({ title, hint, actions, children }: { title: string; hint?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <section className={cardStyle}>
      <div className={css({ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "3", flexWrap: "wrap" })}>
        <div className={css({ minWidth: 0 })}>
          <h2 className={headStyle}>{title}</h2>
          {hint && <p className={hintStyle}>{hint}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

export const Hint = ({ children }: { children: ReactNode }) => <p className={hintStyle}>{children}</p>;

export function Stat({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: ReactNode; tone?: "good" | "warn" | "bad" }) {
  const color = tone === "good" ? "green.700" : tone === "bad" ? "red.600" : tone === "warn" ? "gold.700" : "fg.default";
  return (
    <div className={css({ border: "1px solid", borderColor: "border.subtle", borderRadius: "lg", padding: "3", background: "bg.canvas", minWidth: 0 })}>
      <div className={css({ fontSize: "xs", color: "fg.muted" })}>{label}</div>
      <div className={css({ fontFamily: "display", fontSize: "2xl", fontWeight: "semibold", fontVariantNumeric: "tabular-nums" })} style={{ color: undefined }} data-tone={tone}>
        <span className={css({ color })}>{value}</span>
      </div>
      {sub && <div className={css({ fontSize: "xs", color: "fg.muted" })}>{sub}</div>}
    </div>
  );
}

export const StatGrid = ({ children }: { children: ReactNode }) => (
  <div className={css({ display: "grid", gridTemplateColumns: { base: "1fr 1fr", md: "repeat(4, 1fr)" }, gap: "3" })}>{children}</div>
);

const TONES: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  VERIFIED: "default", APPROVED: "default", MATCHED: "default", COMPLETE: "default", ACCEPTED: "default", ENFORCE: "default", PAID: "default",
  NEEDS_ACCOUNTANT_APPROVAL: "secondary", SHADOW: "secondary", PARTIAL: "secondary", DIFFERS: "secondary", IN_REVIEW: "secondary", PROPOSED: "secondary", DRAFT: "secondary",
  NEEDS_PRODUCT_INFORMATION: "outline", MISSING: "outline", OFF: "outline", PENDING_VERIFICATION: "outline", UNRESOLVED: "outline", MISSING_MAPPING: "outline", NONE: "outline",
  ERROR: "destructive", REJECTED: "destructive",
};

/** A status in words: NEEDS_ACCOUNTANT_APPROVAL → "Needs accountant approval". */
export function StatusPill({ status }: { status: string }) {
  const text = status.replace(/_/g, " ").toLowerCase().replace(/^./, (c) => c.toUpperCase());
  return <Badge variant={TONES[status] ?? "outline"}>{text}</Badge>;
}

export const Notice = ({ tone = "info", children }: { tone?: "info" | "warn" | "bad"; children: ReactNode }) => (
  <div
    role={tone === "info" ? "note" : "alert"}
    className={css({ borderRadius: "lg", padding: "3", fontSize: "sm", lineHeight: "relaxed", border: "1px solid", borderColor: tone === "bad" ? "red.300" : "gold.300", background: tone === "bad" ? "red.50" : "gold.50", color: "fg.default" })}
  >
    {children}
  </div>
);

export const gridStyle = css({ display: "grid", gap: "3", gridTemplateColumns: { base: "1fr", md: "1fr 1fr" } });
export const fieldStyle = css({ display: "flex", flexDirection: "column", gap: "1.5", minWidth: 0 });
export const rowStyle = css({ display: "flex", gap: "2", flexWrap: "wrap", alignItems: "center" });
export const pageStyle = css({ display: "flex", flexDirection: "column", gap: "5" });
export const scrollX = css({ overflowX: "auto" });
