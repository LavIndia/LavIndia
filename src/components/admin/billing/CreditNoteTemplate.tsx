import type { CreditNoteSnapshot } from "@/modules/billing";
import { INVOICE_THEME as T } from "@/modules/billing/invoices/invoice-theme";
import { InvoiceMasthead } from "./InvoiceHeader";
import { LineItems } from "./InvoiceTemplate";
import { CreditNoteTotals } from "./CreditNoteTotals";

/**
 * The credit note: the invoice's twin, in the same ivory and brown, that
 * cancels it.
 *
 * Reads ONLY its frozen snapshot, exactly as the invoice does, so a reprint
 * years later is the document that was issued. The same masthead, line table
 * and print rules are shared with the invoice, so the pair always looks like
 * one set of books.
 */
export function CreditNoteTemplate({ note }: { note: CreditNoteSnapshot }) {
  return (
    <div
      className="invoice-page"
      style={{
        width: `${T.pageWidthMm}mm`,
        minHeight: `${T.pageHeightMm}mm`,
        boxSizing: "border-box",
        padding: `${T.pageMarginMm}mm`,
        background: T.page,
        color: T.text,
        fontFamily: T.sans,
        display: "flex",
        flexDirection: "column",
        gap: "8mm",
      }}
    >
      <InvoiceMasthead title="CREDIT NOTE" />
      <CreditNoteParties note={note} />

      <div
        style={{
          background: T.card,
          padding: "8mm 7mm",
          display: "flex",
          flexDirection: "column",
          gap: "6mm",
          flex: 1,
        }}
      >
        <LineItems invoice={note} />
        <CreditNoteTotals note={note} />
      </div>

      <CreditNoteFooter note={note} />
    </div>
  );
}

/** Who the credit is for, and which documents it ties together. Empty fields are omitted. */
function CreditNoteParties({ note }: { note: CreditNoteSnapshot }) {
  const { customer, business } = note;
  const heading = { fontSize: "2.8mm", fontWeight: 700, letterSpacing: "0.2mm", color: T.ink, marginBottom: "1.5mm" } as const;
  const line = { fontSize: "3mm", lineHeight: 1.5 } as const;
  const rightLine = { ...line, textAlign: "right" as const };
  const date = (iso: string) =>
    new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const hasCustomer =
    customer.name || customer.mobile || customer.gstin || (customer.addressLines?.length ?? 0) > 0;

  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: "10mm" }}>
      <div style={{ minWidth: 0 }}>
        <div style={heading}>CREDITED TO :</div>
        {hasCustomer ? (
          <>
            {customer.name && <div style={{ ...line, fontWeight: 600 }}>{customer.name}</div>}
            {customer.addressLines?.map((addressLine, index) => (
              <div key={index} style={line}>
                {addressLine}
              </div>
            ))}
            {customer.mobile && <div style={line}>{customer.mobile}</div>}
            {customer.gstin && <div style={line}>GSTIN {customer.gstin}</div>}
          </>
        ) : (
          <div style={{ ...line, color: T.textMuted }}>Walk-in customer</div>
        )}
      </div>

      <div style={{ whiteSpace: "nowrap" }}>
        <div style={rightLine}>
          <strong>Credit Note No.</strong> {note.creditNoteNumber}
        </div>
        <div style={rightLine}>
          <strong>Date</strong> {date(note.issuedAt)}
        </div>
        <div style={rightLine}>
          <strong>Invoice No.</strong> {note.invoice.invoiceNumber}
        </div>
        <div style={{ ...rightLine, color: T.textMuted }}>Invoice dated {date(note.invoice.issuedAt)}</div>
        {business.gstNumber && (
          <div style={{ ...rightLine, color: T.textMuted, marginTop: "1mm" }}>
            GSTIN {business.gstNumber}
          </div>
        )}
      </div>
    </div>
  );
}

/** A plain statement of what the note does, and the business details opposite. */
function CreditNoteFooter({ note }: { note: CreditNoteSnapshot }) {
  const { business } = note;
  const detail = { fontSize: "2.7mm", lineHeight: 1.6, textAlign: "right" as const };

  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "10mm", paddingTop: "2mm" }}>
      <div style={{ fontSize: "2.8mm", fontStyle: "italic", color: T.inkSoft, maxWidth: "95mm", lineHeight: 1.6 }}>
        This credit note cancels invoice {note.invoice.invoiceNumber} in full, together with the
        GST charged on it.
      </div>
      <div>
        <div style={{ ...detail, fontWeight: 700, color: T.ink, fontSize: "3mm" }}>{business.name}</div>
        {business.contactNumber && <div style={detail}>{business.contactNumber}</div>}
        {business.email && <div style={detail}>{business.email}</div>}
        {business.address && <div style={detail}>{business.address}</div>}
      </div>
    </div>
  );
}
