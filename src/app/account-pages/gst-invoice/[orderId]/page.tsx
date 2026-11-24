"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { css } from "styled-system/css";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeaderSection } from "@/components/layout/HeaderSection";
import { FooterSection } from "@/components/layout/FooterSection";
import { InvoicePrintStyles } from "@/components/admin/billing/InvoiceFooter";
import { ScaledPage } from "@/components/admin/billing/ScaledPage";
import { GstInvoiceTemplate, type GstInvoiceView } from "@/components/admin/gst/GstInvoiceTemplate";

/** The customer's own GST tax invoice, to print or save as a PDF. */
export default function CustomerGstInvoicePage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = use(params);
  const [invoice, setInvoice] = useState<GstInvoiceView | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/user/orders/${orderId}/gst-invoice`, { cache: "no-store" })
      .then(async (r) => {
        const body = await r.json().catch(() => ({}));
        if (r.ok) setInvoice(body.invoice);
        else setMessage(r.status === 401 ? "Please sign in to see your invoice." : "A GST invoice is not available for this order.");
      })
      .catch(() => setMessage("Could not load the invoice. Please try again."));
  }, [orderId]);

  return (
    <>
      <div className="no-print"><HeaderSection /></div>
      <main className={css({ maxWidth: "6xl", marginInline: "auto", padding: { base: "4", md: "8" }, display: "flex", flexDirection: "column", gap: "4", minHeight: "60vh" })}>
        <InvoicePrintStyles />
        <div className={css({ display: "flex", justifyContent: "space-between", gap: "3", flexWrap: "wrap" })}>
          <Button variant="outline" size="sm" asChild><Link href="/orders"><ArrowLeft className={css({ height: "4", width: "4" })} />My orders</Link></Button>
          {invoice && <Button onClick={() => window.print()}><Printer className={css({ height: "4", width: "4" })} />Print or save as PDF</Button>}
        </div>
        {message && <p className={css({ color: "fg.muted" })}>{message}</p>}
        {!invoice && !message && <p className={css({ color: "fg.muted" })}>Loading…</p>}
        {invoice && <div className={css({ border: "1px solid", borderColor: "border.subtle", borderRadius: "md", padding: { base: "2", md: "4" }, overflow: "auto" })}><ScaledPage><GstInvoiceTemplate invoice={invoice} /></ScaledPage></div>}
      </main>
      <div className="no-print"><FooterSection /></div>
    </>
  );
}
