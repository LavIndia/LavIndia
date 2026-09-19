"use client";

import { Button } from "@/components/ui/button";
import { Printer, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { css } from "styled-system/css";
import type { InvoiceSnapshot } from "@/modules/billing";
import { InvoiceTemplate } from "@/components/admin/billing/InvoiceTemplate";
import { InvoicePrintStyles } from "@/components/admin/billing/InvoiceFooter";

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
  padding: "4",
  overflow: "auto",
});
const hintStyle = css({ fontSize: "xs", color: "fg.muted" });

/**
 * The invoice on screen, and the thing that prints.
 *
 * One component for both: the preview merely scales the page down to fit, so
 * what is previewed is exactly what comes out. "Save as PDF" in the browser's
 * print dialog produces the PDF — a separate PDF pipeline would be a second
 * renderer to keep in step with this one, and they would drift.
 */
export function InvoiceView({ invoice }: { invoice: InvoiceSnapshot }) {
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
          Print invoice
        </Button>
      </div>

      <div className={frameStyle}>
        {/* The outer box reserves the SCALED height; the inner one does the
            scaling. Putting both on one element scales the height too, and
            the page overflows its own container — which clipped the footer. */}
        <div style={{ width: "164mm", height: "232mm" }}>
          <div
            className="invoice-print-area"
            style={{ width: "210mm", transform: "scale(0.78)", transformOrigin: "top left" }}
          >
            <InvoiceTemplate invoice={invoice} />
          </div>
        </div>
      </div>
    </div>
  );
}
