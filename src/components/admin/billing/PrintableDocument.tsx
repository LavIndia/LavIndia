"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Printer, ArrowLeft } from "lucide-react";
import { css } from "styled-system/css";
import { InvoicePrintStyles } from "./InvoiceFooter";
import { ScaledPage } from "./ScaledPage";

const barStyle = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "3",
  flexWrap: "wrap",
});
const frameStyle = css({
  border: "1px solid",
  borderColor: "border.subtle",
  borderRadius: "md",
  background: "bg.canvas",
  padding: { base: "2", md: "4" },
  overflow: "auto",
});
const hintStyle = css({ fontSize: "xs", color: "fg.muted" });

/**
 * A billing document on screen, and the thing that prints — the invoice and
 * the credit note both.
 *
 * One component for both: the preview merely scales the page down to fit, so
 * what is previewed is exactly what comes out. "Save as PDF" in the browser's
 * print dialog produces the PDF — a separate PDF pipeline would be a second
 * renderer to keep in step with this one, and they would drift.
 */
export function PrintableDocument({
  printLabel,
  children,
}: {
  printLabel: string;
  children: ReactNode;
}) {
  return (
    <div className={css({ display: "flex", flexDirection: "column", gap: "4" })}>
      <InvoicePrintStyles />

      <div className={barStyle}>
        <Button variant="outline" size="sm" asChild>
          <Link href="/admin/orders">
            <ArrowLeft className={css({ height: "4", width: "4" })} />
            Orders
          </Link>
        </Button>
        <span className={hintStyle}>
          Print, or choose “Save as PDF” in the print dialog. Set Margins to
          None and Scale to 100 so the layout comes out as designed.
        </span>
        <Button onClick={() => window.print()}>
          <Printer className={css({ height: "4", width: "4" })} />
          {printLabel}
        </Button>
      </div>

      <div className={frameStyle}>
        <ScaledPage>{children}</ScaledPage>
      </div>
    </div>
  );
}
