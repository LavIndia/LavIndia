import Link from "next/link";
import { notFound } from "next/navigation";
import { FileText } from "lucide-react";
import { css } from "styled-system/css";
import { getCreditNoteByOrder } from "@/modules/billing";
import { Button } from "@/components/ui/button";
import { AdminPageHeader } from "@/components/admin/shared/AdminPageHeader";
import { CreditNoteTemplate } from "@/components/admin/billing/CreditNoteTemplate";
import { PrintableDocument } from "@/components/admin/billing/PrintableDocument";

const pageStyle = css({ display: "flex", flexDirection: "column", gap: "5" });

/**
 * The credit note against an order's invoice, beside the invoice it cancels
 * (/admin/invoices/[orderId]). Rendered from its frozen snapshot only.
 */
export default async function CreditNotePage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  const note = await getCreditNoteByOrder(orderId);
  if (!note) notFound();

  const issued = new Date(note.snapshot.issuedAt).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <div className={pageStyle}>
      <AdminPageHeader
        title={note.creditNoteNumber}
        subtitle={`Issued ${issued} · ${note.snapshot.reason} · Credits ${note.snapshot.invoice.invoiceNumber}`}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href={`/admin/invoices/${orderId}`}>
              <FileText className={css({ height: "4", width: "4" })} />
              {note.snapshot.invoice.invoiceNumber}
            </Link>
          </Button>
        }
      />
      <PrintableDocument printLabel="Print credit note">
        <CreditNoteTemplate note={note.snapshot} />
      </PrintableDocument>
    </div>
  );
}
