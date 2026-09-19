import { notFound } from "next/navigation";
import { css } from "styled-system/css";
import { billingService } from "@/modules/billing";
import { OrderId } from "@/modules/_shared/ids";
import { AdminPageHeader } from "@/components/admin/shared/AdminPageHeader";
import { InvoiceView } from "./InvoiceView";

const pageStyle = css({ display: "flex", flexDirection: "column", gap: "5" });

export default async function InvoicePage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;

  // Read straight from the frozen snapshot — no catalog lookup, so an old
  // invoice renders exactly as it was issued.
  const invoice = await billingService.getInvoiceByOrder(OrderId(orderId));
  if (!invoice) notFound();

  return (
    <div className={pageStyle}>
      <AdminPageHeader
        title={invoice.invoiceNumber}
        subtitle={`Issued ${new Date(invoice.snapshot.issuedAt).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        })}`}
      />
      <InvoiceView invoice={invoice.snapshot} />
    </div>
  );
}
