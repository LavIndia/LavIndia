import { formatPaisa } from "@/modules/_shared/money";
import type { InvoiceSnapshot } from "@/modules/billing";
import { INVOICE_THEME as T } from "@/modules/billing/invoices/invoice-theme";
import { InvoiceMasthead, InvoiceParties } from "./InvoiceHeader";
import { InvoiceFooter } from "./InvoiceFooter";

/**
 * The invoice, rebuilt from the Canva reference as React and CSS.
 *
 * Reads ONLY the frozen snapshot — never the catalog, never live settings.
 * That is what makes an old bill immutable: reprinting a five-year-old
 * invoice cannot be affected by a product being renamed, repriced or deleted,
 * because there is nothing here that could look any of it up.
 *
 * The same component serves ONLINE and STORE sales. One engine, one template,
 * one difference: `source`.
 *
 * Sized in millimetres and styled inline throughout, for the same reason the
 * barcode labels are — print engines drop external CSS, and a bill that comes
 * out misaligned is a bill someone has to apologise for.
 */
export function InvoiceTemplate({ invoice }: { invoice: InvoiceSnapshot }) {
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
      <InvoiceMasthead />
      <InvoiceParties invoice={invoice} />

      {/* The white card: line items and the money, as one block. */}
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
        <LineItems invoice={invoice} />
        <PaymentAndTotals invoice={invoice} />
      </div>

      <InvoiceFooter invoice={invoice} />
    </div>
  );
}

function LineItems({ invoice }: { invoice: InvoiceSnapshot }) {
  const cell = { padding: "2.2mm 1.5mm", fontSize: "3mm" } as const;
  const headCell = {
    ...cell,
    fontSize: "2.6mm",
    fontWeight: 700,
    letterSpacing: "0.3mm",
    textTransform: "uppercase" as const,
    color: T.ink,
    borderBottom: `0.4mm solid ${T.ink}`,
  };

  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr>
          <th style={{ ...headCell, textAlign: "left", width: "10mm" }}>No</th>
          <th style={{ ...headCell, textAlign: "left" }}>Product Description</th>
          <th style={{ ...headCell, textAlign: "right", width: "28mm" }}>Price</th>
          <th style={{ ...headCell, textAlign: "right", width: "16mm" }}>Qty</th>
          <th style={{ ...headCell, textAlign: "right", width: "30mm" }}>Total</th>
        </tr>
      </thead>
      <tbody>
        {invoice.lines.map((line) => (
          <tr key={line.position} style={{ borderBottom: `0.2mm solid ${T.rule}` }}>
            <td style={{ ...cell, textAlign: "left", color: T.textMuted }}>
              {String(line.position).padStart(2, "0")}
            </td>
            <td style={{ ...cell, textAlign: "left" }}>
              <div style={{ fontWeight: 600 }}>{line.description}</div>
              {/* Variant, SKU and HSN sit under the name in a lighter weight.
                  Each is omitted entirely when absent, never left blank. */}
              {(line.variantName || line.sku || line.hsnCode) && (
                <div style={{ fontSize: "2.4mm", color: T.textMuted, marginTop: "0.6mm" }}>
                  {[
                    line.variantName,
                    line.sku,
                    line.hsnCode ? `HSN ${line.hsnCode}` : null,
                  ]
                    .filter(Boolean)
                    .join("  ·  ")}
                </div>
              )}
            </td>
            <td style={{ ...cell, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
              {/* A concession is shown as one, never folded into the price. */}
              {line.catalogPriceCents && (
                <div
                  style={{
                    fontSize: "2.4mm",
                    color: T.textMuted,
                    textDecoration: "line-through",
                  }}
                >
                  {formatPaisa(line.catalogPriceCents)}
                </div>
              )}
              {formatPaisa(line.unitPriceCents)}
            </td>
            <td style={{ ...cell, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
              {line.quantity}
            </td>
            <td
              style={{
                ...cell,
                textAlign: "right",
                fontVariantNumeric: "tabular-nums",
                fontWeight: 600,
              }}
            >
              {formatPaisa(line.lineTotalCents)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function PaymentAndTotals({ invoice }: { invoice: InvoiceSnapshot }) {
  const { totals, payment } = invoice;
  const label = { fontSize: "2.6mm", color: T.textMuted } as const;
  const row = {
    display: "flex",
    justifyContent: "space-between",
    gap: "8mm",
    fontSize: "3mm",
    fontVariantNumeric: "tabular-nums" as const,
  };

  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: "10mm" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "1.2mm", minWidth: 0 }}>
        <div
          style={{
            fontSize: "2.8mm",
            fontWeight: 700,
            color: T.ink,
            marginBottom: "1mm",
          }}
        >
          Payment Details :
        </div>
        <div style={label}>Method : {payment.method}</div>
        {/* Who paid and the bank's reference — the fields that make this
            reconcilable against a statement. Omitted when not known. */}
        {payment.payerVpa && <div style={label}>Paid from : {payment.payerVpa}</div>}
        {payment.utr && <div style={label}>UTR : {payment.utr}</div>}
        {!payment.utr && payment.reference && (
          <div style={label}>Reference : {payment.reference}</div>
        )}
        <div style={label}>Order : {invoice.orderNumber}</div>
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
        {totals.shippingCents > 0 && (
          <div style={row}>
            <span style={{ color: T.textMuted }}>Shipping</span>
            <span>{formatPaisa(totals.shippingCents)}</span>
          </div>
        )}
        <div style={row}>
          <span style={{ color: T.textMuted }}>
            Tax{invoice.lines[0]?.taxRateBps ? ` (${invoice.lines[0].taxRateBps / 100}%)` : ""}
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
          <span>Total</span>
          <span>{formatPaisa(totals.grandTotalCents)}</span>
        </div>
      </div>
    </div>
  );
}
