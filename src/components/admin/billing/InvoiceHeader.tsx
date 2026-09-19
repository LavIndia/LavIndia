import type { InvoiceSnapshot } from "@/modules/billing";
import { INVOICE_THEME as T } from "@/modules/billing/invoices/invoice-theme";

/**
 * The masthead: a solid brown square carrying the lotus mark and wordmark at
 * top-left, with INVOICE set large in letterspaced serif caps at top-right,
 * underlined by a rule that stops short of the page edge.
 *
 * The lotus is inline SVG rather than an image file so it prints at the
 * printer's own resolution and never depends on an asset loading.
 */
export function InvoiceMasthead() {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
      <div
        style={{
          background: T.ink,
          color: T.page,
          width: "34mm",
          height: "26mm",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1.5mm",
        }}
      >
        <svg width="12mm" height="8mm" viewBox="0 0 48 32" aria-hidden="true">
          {/* A lotus, drawn as five simple petals — legible at any size and
              without a font or image dependency. */}
          <g fill="none" stroke={T.page} strokeWidth="1.6" strokeLinecap="round">
            <path d="M24 5 C21 13 21 21 24 27 C27 21 27 13 24 5Z" />
            <path d="M24 27 C19 22 14 18 8 16 C10 22 16 26 24 27Z" />
            <path d="M24 27 C29 22 34 18 40 16 C38 22 32 26 24 27Z" />
            <path d="M24 27 C20 20 15 15 9 11" />
            <path d="M24 27 C28 20 33 15 39 11" />
          </g>
        </svg>
        <span
          style={{
            fontFamily: T.serif,
            fontSize: "3.4mm",
            letterSpacing: "0.7mm",
            fontWeight: 700,
          }}
        >
          LAVINDIA
        </span>
      </div>

      <div style={{ textAlign: "right" }}>
        <div
          style={{
            fontFamily: T.serif,
            fontSize: "13mm",
            letterSpacing: "2.2mm",
            color: T.ink,
            lineHeight: 1,
          }}
        >
          INVOICE
        </div>
        <div
          style={{
            marginTop: "2.5mm",
            marginLeft: "auto",
            width: "52mm",
            borderBottom: `0.5mm solid ${T.ink}`,
          }}
        />
      </div>
    </div>
  );
}

/**
 * Who it is for, and which invoice it is.
 *
 * Every field is omitted entirely when it has no value — a walk-in sale with
 * no name simply shows fewer lines rather than a column of blanks or dashes.
 */
export function InvoiceParties({ invoice }: { invoice: InvoiceSnapshot }) {
  const { customer, business } = invoice;
  const heading = {
    fontSize: "2.8mm",
    fontWeight: 700,
    letterSpacing: "0.2mm",
    color: T.ink,
    marginBottom: "1.5mm",
  } as const;
  const line = { fontSize: "3mm", lineHeight: 1.5 } as const;
  const rightLine = { ...line, textAlign: "right" as const };

  const issued = new Date(invoice.issuedAt).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const hasCustomer =
    customer.name || customer.mobile || customer.gstin || (customer.addressLines?.length ?? 0) > 0;

  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: "10mm" }}>
      <div style={{ minWidth: 0 }}>
        <div style={heading}>INVOICE TO :</div>
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
          // A counter sale with nobody named is stated plainly rather than
          // left as an empty block.
          <div style={{ ...line, color: T.textMuted }}>Walk-in customer</div>
        )}
      </div>

      <div style={{ whiteSpace: "nowrap" }}>
        <div style={rightLine}>
          <strong>Invoice No.</strong> {invoice.invoiceNumber}
        </div>
        <div style={rightLine}>
          <strong>Date</strong> {issued}
        </div>
        {/* Shown only for counter sales, so an online invoice is not cluttered
            by a distinction that means nothing to the customer. */}
        {invoice.source === "STORE" && (
          <div style={{ ...rightLine, color: T.textMuted }}>Sold in store</div>
        )}
        {business.gstNumber && (
          <div style={{ ...rightLine, color: T.textMuted, marginTop: "1mm" }}>
            GSTIN {business.gstNumber}
          </div>
        )}
      </div>
    </div>
  );
}
