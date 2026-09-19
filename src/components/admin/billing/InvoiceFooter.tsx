import type { InvoiceSnapshot } from "@/modules/billing";
import { INVOICE_THEME as T } from "@/modules/billing/invoices/invoice-theme";

/**
 * The closing band: a large "Thank You" bottom-left with the greeting beneath
 * it, and the business details right-aligned opposite.
 *
 * The Canva reference sets "Thank You" in a signature script. That is
 * deliberately NOT reproduced with a webfont — a font that fails to load mid
 * print leaves the most prominent words on the document set in something
 * arbitrary. A large serif italic carries the same warmth from fonts every
 * machine already has.
 */
export function InvoiceFooter({ invoice }: { invoice: InvoiceSnapshot }) {
  const { business } = invoice;
  const detail = { fontSize: "2.7mm", lineHeight: 1.6, textAlign: "right" as const };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        gap: "10mm",
        paddingTop: "2mm",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontFamily: T.serif,
            fontStyle: "italic",
            fontSize: "14mm",
            lineHeight: 1,
            color: T.ink,
          }}
        >
          Thank You
        </div>
        {/* Chosen from a curated list and frozen at issue time, so reprinting
            an old invoice reproduces the same document. */}
        <div
          style={{
            marginTop: "2mm",
            fontSize: "2.8mm",
            fontStyle: "italic",
            color: T.inkSoft,
            maxWidth: "95mm",
          }}
        >
          {invoice.greeting}
        </div>
      </div>

      <div>
        <div style={{ ...detail, fontWeight: 700, color: T.ink, fontSize: "3mm" }}>
          {business.name}
        </div>
        {/* Each line omitted when unset, rather than printed as an empty row. */}
        {business.contactNumber && <div style={detail}>{business.contactNumber}</div>}
        {business.email && <div style={detail}>{business.email}</div>}
        {business.address && <div style={detail}>{business.address}</div>}
      </div>
    </div>
  );
}

/**
 * Print rules for the invoice.
 *
 * `@page` with A4 and zero margin stops the browser adding its own margin on
 * top of the template's, which would otherwise push a long invoice onto a
 * second page for no reason.
 */
export function InvoicePrintStyles() {
  return (
    <style>{`
      @media print {
        @page { size: A4 portrait; margin: 0; }
        html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
        /* Everything that is not the invoice is hidden, so admin chrome never
           appears on a document handed to a customer. */
        body * { visibility: hidden !important; }
        .invoice-print-area, .invoice-print-area * { visibility: visible !important; }
        .invoice-print-area {
          position: absolute !important;
          left: 0 !important;
          top: 0 !important;
          /* The preview scales the page down to fit on screen; that inline
             transform must be beaten here or the invoice prints shrunk. */
          transform: none !important;
          zoom: 1 !important;
          width: auto !important;
          height: auto !important;
          margin: 0 !important;
          padding: 0 !important;
          overflow: visible !important;
        }
        /* On screen the page is warm ivory, which suits the brand. On paper
           it prints WHITE: a full-bleed tint costs a great deal of ink,
           prints muddy on anything but good stock, and makes the document
           look photocopied rather than issued. The brown ink stays. */
        .invoice-page {
          background: #ffffff !important;
        }
        /* The masthead block and the brown rules must still print as brown
           even in "save ink" modes, or the document loses its only colour. */
        .invoice-page, .invoice-page * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .invoice-page { break-after: auto; page-break-after: auto; }
      }
    `}</style>
  );
}
