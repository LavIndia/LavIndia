import type { ReactNode } from "react";
import { css } from "styled-system/css";
import { AdminPageHeader } from "@/components/admin/shared/AdminPageHeader";
import { GstNav } from "@/components/admin/gst/gst-ui";

export const dynamic = "force-dynamic";

/** Every GST screen: one heading and one strip of sections. */
export default function GstLayout({ children }: { children: ReactNode }) {
  return (
    <div className={css({ display: "flex", flexDirection: "column", gap: "4" })}>
      <AdminPageHeader title="GST" subtitle="Registration, classification, rates, invoices and returns" />
      <GstNav />
      {children}
    </div>
  );
}
