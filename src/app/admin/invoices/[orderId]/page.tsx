import Link from "next/link";
import { notFound } from "next/navigation";
import { FileMinus } from "lucide-react";
import { css } from "styled-system/css";
import { billingService, getCreditNoteByOrder } from "@/modules/billing";
import { OrderId } from "@/modules/_shared/ids";
import { Button } from "@/components/ui/button";
import { AdminPageHeader } from "@/components/admin/shared/AdminPageHeader";
import { InvoiceView } from "./InvoiceView";

const pageStyle = css({ display: "flex", flexDirection: "column", gap: "5" });

const longDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });

export default async function InvoicePage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;

  // Read straight from the frozen snapshots — no catalog lookup, so an old
  // invoice renders exactly as it was issued. The invoice itself is never
  // changed once issued; a credit note against it is shown alongside.
  const [invoice, creditNote] = await Promise.all([
    billingService.getInvoiceByOrder(OrderId(orderId)),
    getCreditNoteByOrder(orderId),
  ]);
  if (!invoice) notFound();

  const issued = `Issued ${longDate(invoice.snapshot.issuedAt)}`;

  return (
    <div className={pageStyle}>
      <AdminPageHeader
        title={invoice.invoiceNumber}
        subtitle={
          creditNote ? `${issued} · Credited by ${creditNote.creditNoteNumber}` : issued
        }
        actions={
          creditNote && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/admin/invoices/${orderId}/credit-note`}>
                <FileMinus className={css({ height: "4", width: "4" })} />
                {creditNote.creditNoteNumber}
              </Link>
            </Button>
          )
        }
      />
      <InvoiceView invoice={invoice.snapshot} />
    </div>
  );
}
