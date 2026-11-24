import { InvoiceDetailPanel } from "@/components/admin/gst/InvoiceDetailPanel";

export default async function GstInvoicePage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  return <InvoiceDetailPanel orderId={orderId} />;
}
