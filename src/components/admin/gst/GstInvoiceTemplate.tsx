import { INVOICE_THEME as T } from "@/modules/billing/invoices/invoice-theme";
import { rateLabel, rupeesInWords } from "@/modules/gst/format";
import { InvoiceMasthead } from "@/components/admin/billing/InvoiceHeader";

export interface GstInvoiceLine { position: number; description: string; code: string; quantity: number; uqc: string; rateBps: number; taxableCents: number; cgstCents: number; sgstCents: number; igstCents: number; cessCents: number; payableCents: number }
export interface GstInvoiceView {
  invoiceNumber: string;
  invoiceDate: string | Date;
  supplier: { name: string; legalName: string; gstin: string; stateCode: string | null; address: string | Record<string, unknown> };
  recipient: { name?: string | null; gstin?: string | null; mobile?: string | null; addressLines?: string[]; state?: string | null; stateCode?: string | null };
  placeOfSupplyCode: string;
  supplyType: "INTRA_STATE" | "INTER_STATE";
  lines: GstInvoiceLine[];
  rateSummary: Array<{ code: string; rateBps: number; taxableCents: number; cgstCents: number; sgstCents: number; igstCents: number; cessCents: number }>;
  taxableCents: number; cgstCents: number; sgstCents: number; igstCents: number; cessCents: number; totalTaxCents: number;
  untaxedChargesCents: number; invoiceValueCents: number;
  reverseCharge: boolean; declarations: string[];
  irn?: string | null;
  creditNotes?: Array<{ creditNoteNumber: string; issuedAt: string | Date; totalTaxCents: number; refundCents: number }>;
}

const inr = (cents: number) => (cents / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const day = (d: string | Date) => new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
const addressText = (a: GstInvoiceView["supplier"]["address"]) => (typeof a === "string" ? a : Object.values(a).filter((v) => typeof v === "string" && v).join(", "));

const th = { padding: "1.6mm 1mm", fontSize: "2.4mm", fontWeight: 700, letterSpacing: "0.2mm", textTransform: "uppercase", color: T.ink, borderBottom: `0.4mm solid ${T.ink}` } as const;
const td = { padding: "1.8mm 1mm", fontSize: "2.8mm", verticalAlign: "top", borderBottom: `0.2mm solid ${T.rule}` } as const;
const num = { textAlign: "right", whiteSpace: "nowrap" } as const;
const total = { paddingTop: "1.5mm", fontFamily: T.serif, fontSize: "3.6mm", fontWeight: 700, color: T.ink, borderTop: `0.4mm solid ${T.ink}` } as const;

/**
 * A GST tax invoice, drawn from the GST particulars saved when the invoice was
 * issued — never from live settings or a recalculation, so reprinting an old
 * invoice cannot change it. Sized in millimetres and styled inline, like the
 * existing invoice, so it prints exactly as it appears.
 */
export function GstInvoiceTemplate({ invoice: v }: { invoice: GstInvoiceView }) {
  const inter = v.supplyType === "INTER_STATE";
  const hasCess = v.cessCents > 0;
  const heading = { fontSize: "2.6mm", fontWeight: 700, color: T.ink, marginBottom: "1mm" } as const;
  const line = { fontSize: "3mm", lineHeight: 1.5 } as const;

  return (
    <div className="invoice-page" style={{ width: `${T.pageWidthMm}mm`, minHeight: `${T.pageHeightMm}mm`, boxSizing: "border-box", padding: `${T.pageMarginMm}mm`, background: T.page, color: T.text, fontFamily: T.sans, display: "flex", flexDirection: "column", gap: "6mm" }}>
      <InvoiceMasthead title="TAX INVOICE" />

      <div style={{ display: "flex", justifyContent: "space-between", gap: "8mm" }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={heading}>SOLD BY</div>
          <div style={{ ...line, fontWeight: 600 }}>{v.supplier.legalName}</div>
          <div style={line}>{addressText(v.supplier.address)}</div>
          <div style={line}>GSTIN {v.supplier.gstin}</div>
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={heading}>BILLED TO</div>
          {v.recipient.name ? <div style={{ ...line, fontWeight: 600 }}>{v.recipient.name}</div> : <div style={{ ...line, color: T.textMuted }}>Walk-in customer</div>}
          {v.recipient.addressLines?.map((a, i) => <div key={i} style={line}>{a}</div>)}
          {v.recipient.mobile && <div style={line}>{v.recipient.mobile}</div>}
          {v.recipient.gstin && <div style={line}>GSTIN {v.recipient.gstin}</div>}
        </div>
        <div style={{ whiteSpace: "nowrap", textAlign: "right" }}>
          <div style={line}><strong>Invoice No.</strong> {v.invoiceNumber}</div>
          <div style={line}><strong>Date</strong> {day(v.invoiceDate)}</div>
          <div style={line}><strong>Place of supply</strong> {v.recipient.state ? `${v.recipient.state} ` : ""}({v.placeOfSupplyCode})</div>
          <div style={line}><strong>Reverse charge</strong> {v.reverseCharge ? "Yes" : "No"}</div>
        </div>
      </div>

      <div style={{ background: T.card, padding: "6mm 5mm", display: "flex", flexDirection: "column", gap: "5mm", flex: 1 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>
            <th style={{ ...th, textAlign: "left" }}>No</th><th style={{ ...th, textAlign: "left" }}>Description</th><th style={{ ...th, textAlign: "left" }}>HSN/SAC</th>
            <th style={{ ...th, ...num }}>Qty</th><th style={{ ...th, ...num }}>Taxable</th><th style={{ ...th, ...num }}>Rate</th>
            {inter ? <th style={{ ...th, ...num }}>IGST</th> : <><th style={{ ...th, ...num }}>CGST</th><th style={{ ...th, ...num }}>SGST</th></>}
            {hasCess && <th style={{ ...th, ...num }}>Cess</th>}
            <th style={{ ...th, ...num }}>Total</th>
          </tr></thead>
          <tbody>
            {v.lines.map((l) => (
              <tr key={l.position}>
                <td style={td}>{l.position}</td><td style={td}>{l.description}</td><td style={td}>{l.code}</td>
                <td style={{ ...td, ...num }}>{l.quantity} {l.uqc}</td><td style={{ ...td, ...num }}>{inr(l.taxableCents)}</td><td style={{ ...td, ...num }}>{rateLabel(l.rateBps)}</td>
                {inter ? <td style={{ ...td, ...num }}>{inr(l.igstCents)}</td> : <><td style={{ ...td, ...num }}>{inr(l.cgstCents)}</td><td style={{ ...td, ...num }}>{inr(l.sgstCents)}</td></>}
                {hasCess && <td style={{ ...td, ...num }}>{inr(l.cessCents)}</td>}
                <td style={{ ...td, ...num }}>{inr(l.payableCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <table style={{ borderCollapse: "collapse", minWidth: "78mm", fontSize: "3mm" }}>
            <tbody>
              <tr><td style={{ padding: "0.8mm 0" }}>Taxable value</td><td style={{ ...num, padding: "0.8mm 0" }}>{inr(v.taxableCents)}</td></tr>
              {inter ? <tr><td>IGST</td><td style={num}>{inr(v.igstCents)}</td></tr> : <><tr><td>CGST</td><td style={num}>{inr(v.cgstCents)}</td></tr><tr><td>SGST</td><td style={num}>{inr(v.sgstCents)}</td></tr></>}
              {hasCess && <tr><td>Cess</td><td style={num}>{inr(v.cessCents)}</td></tr>}
              {v.untaxedChargesCents > 0 && <tr><td>Charges without GST</td><td style={num}>{inr(v.untaxedChargesCents)}</td></tr>}
              <tr><td style={total}>Invoice value</td><td style={{ ...num, ...total }}>₹{inr(v.invoiceValueCents)}</td></tr>
            </tbody>
          </table>
        </div>
        <div style={{ fontSize: "2.9mm", color: T.textMuted }}>{rupeesInWords(v.invoiceValueCents)}</div>

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><th style={{ ...th, textAlign: "left" }}>HSN/SAC</th><th style={{ ...th, ...num }}>Rate</th><th style={{ ...th, ...num }}>Taxable</th><th style={{ ...th, ...num }}>{inter ? "IGST" : "CGST + SGST"}</th></tr></thead>
          <tbody>{v.rateSummary.map((r, i) => <tr key={i}><td style={td}>{r.code}</td><td style={{ ...td, ...num }}>{rateLabel(r.rateBps)}</td><td style={{ ...td, ...num }}>{inr(r.taxableCents)}</td><td style={{ ...td, ...num }}>{inr(inter ? r.igstCents : r.cgstCents + r.sgstCents)}</td></tr>)}</tbody>
        </table>

        {v.creditNotes && v.creditNotes.length > 0 && (
          <div style={{ fontSize: "2.8mm" }}>
            <div style={heading}>CREDIT NOTES ISSUED AGAINST THIS INVOICE</div>
            {v.creditNotes.map((n) => <div key={n.creditNoteNumber}>{n.creditNoteNumber} · {day(n.issuedAt)} · tax reversed ₹{inr(n.totalTaxCents)} · refunded ₹{inr(n.refundCents)}</div>)}
          </div>
        )}
      </div>

      <div style={{ fontSize: "2.6mm", color: T.textMuted, lineHeight: 1.5 }}>
        {v.declarations.map((d, i) => <div key={i}>{d}.</div>)}
        {v.irn && <div>IRN: {v.irn}</div>}
        <div>This is a computer-generated invoice.</div>
      </div>
    </div>
  );
}
