"use client";

import type { InvoiceSnapshot } from "@/modules/billing";
import { InvoiceTemplate } from "@/components/admin/billing/InvoiceTemplate";
import { PrintableDocument } from "@/components/admin/billing/PrintableDocument";

/** The invoice on screen and in print — see PrintableDocument. */
export function InvoiceView({ invoice }: { invoice: InvoiceSnapshot }) {
  return (
    <PrintableDocument printLabel="Print invoice">
      <InvoiceTemplate invoice={invoice} />
    </PrintableDocument>
  );
}
