import { Landmark, Building2, Tags, Percent, Activity, FileSpreadsheet, ReceiptText, BellRing, type LucideIcon } from "lucide-react";

/** The GST section of the admin sidebar, kept apart so the sidebar file stays small. */
export const GST_NAV_GROUP: { label: string; items: Array<{ name: string; href: string; icon: LucideIcon }> } = {
  label: "GST",
  items: [
    { name: "GST Overview", href: "/admin/gst", icon: Landmark },
    { name: "Registration", href: "/admin/gst/business", icon: Building2 },
    { name: "Classification", href: "/admin/gst/classification", icon: Tags },
    { name: "Rates & HSN", href: "/admin/gst/rates", icon: Percent },
    { name: "Calculations", href: "/admin/gst/monitoring", icon: Activity },
    { name: "GST Invoices", href: "/admin/gst/invoices", icon: ReceiptText },
    { name: "GST Reports", href: "/admin/gst/reports", icon: FileSpreadsheet },
    { name: "Updates", href: "/admin/gst/updates", icon: BellRing },
  ],
};
