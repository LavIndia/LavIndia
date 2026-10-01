import { formatPaisa } from "@/modules/_shared/money";
import type { CreditNoteSnapshot } from "@/modules/billing";
import { INVOICE_THEME as T } from "@/modules/billing/invoices/invoice-theme";

/**
 * What is being credited, beside the amounts credited.
 *
 * The figures are the invoice's own, copied at issue — the subtotal, any
 * discount and its offers, delivery, the cash-on-delivery fee and the GST —
 * so the note reverses exactly what was billed. Each row is omitted when it
 * has no value, as on the invoice.
 */
export function CreditNoteTotals({ note }: { note: CreditNoteSnapshot }) {
  const { totals } = note;
  const label = { fontSize: "2.6mm", color: T.textMuted } as const;
  const row = {
    display: "flex",
    justifyContent: "space-between",
    gap: "8mm",
    fontSize: "3mm",
    fontVariantNumeric: "tabular-nums" as const,
  };
  const invoiceDate = new Date(note.invoice.issuedAt).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const rate = note.lines[0]?.taxRateBps ? ` (${note.lines[0].taxRateBps / 100}%)` : "";

  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: "10mm", flexWrap: "wrap" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "1.2mm", minWidth: 0 }}>
        <div style={{ fontSize: "2.8mm", fontWeight: 700, color: T.ink, marginBottom: "1mm" }}>
          Credit Details :
        </div>
        <div style={label}>Reason : {note.reason}</div>
        <div style={label}>
          Against invoice : {note.invoice.invoiceNumber} dated {invoiceDate}
        </div>
        <div style={label}>Order : {note.orderNumber}</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "1.5mm", minWidth: "52mm" }}>
        <div style={row}>
          <span style={{ color: T.textMuted }}>Subtotal</span>
          <span>{formatPaisa(totals.subtotalCents)}</span>
        </div>
        {totals.discountCents > 0 && (
          <div style={row}>
            <span style={{ color: T.textMuted }}>Discount</span>
            <span>−{formatPaisa(totals.discountCents)}</span>
          </div>
        )}
        {totals.offers?.map((offer) => (
          <div key={offer.label} style={{ ...row, fontSize: "2.6mm" }}>
            <span style={{ color: T.textMuted, paddingLeft: "3mm" }}>{offer.label}</span>
            <span style={{ color: T.textMuted }}>−{formatPaisa(offer.savingCents)}</span>
          </div>
        ))}
        {totals.shippingCents > 0 && (
          <div style={row}>
            <span style={{ color: T.textMuted }}>Shipping</span>
            <span>{formatPaisa(totals.shippingCents)}</span>
          </div>
        )}
        {(totals.codFeeCents ?? 0) > 0 && (
          <div style={row}>
            <span style={{ color: T.textMuted }}>Cash on delivery fee</span>
            <span>{formatPaisa(totals.codFeeCents ?? 0)}</span>
          </div>
        )}
        <div style={row}>
          <span style={{ color: T.textMuted }}>
            {totals.taxIncluded ? "GST included" : "GST"}
            {rate} reversed
          </span>
          <span>{formatPaisa(totals.taxCents)}</span>
        </div>
        <div
          style={{
            ...row,
            paddingTop: "1.5mm",
            marginTop: "0.5mm",
            borderTop: `0.4mm solid ${T.ink}`,
            fontFamily: T.serif,
            fontSize: "4.2mm",
            fontWeight: 700,
            color: T.ink,
          }}
        >
          <span>Total credited</span>
          <span>{formatPaisa(totals.grandTotalCents)}</span>
        </div>
      </div>
    </div>
  );
}
