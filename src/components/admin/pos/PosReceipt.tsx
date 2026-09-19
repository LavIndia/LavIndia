"use client";

import { Button } from "@/components/ui/button";
import { Check, Plus, Printer } from "lucide-react";
import Link from "next/link";
import { css } from "styled-system/css";
import { formatPaisa } from "@/modules/_shared/money";
import type { InvoiceSnapshot } from "@/modules/billing";

export interface CompletedSale {
  orderId: string;
  orderNumber: string;
  invoiceNumber: string;
  invoice: InvoiceSnapshot;
  grandTotalCents: number;
}

const wrapStyle = css({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "5",
  paddingBlock: "8",
});
const tickStyle = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  height: "16",
  width: "16",
  borderRadius: "full",
  background: "emerald.500",
  color: "white",
});
const amountStyle = css({
  fontFamily: "display",
  fontSize: "4xl",
  fontWeight: "semibold",
  fontVariantNumeric: "tabular-nums",
});
const metaStyle = css({ fontSize: "sm", color: "fg.muted", textAlign: "center" });
const actionsStyle = css({ display: "flex", flexWrap: "wrap", gap: "3", justifyContent: "center" });
const summaryStyle = css({
  width: "full",
  maxWidth: "26rem",
  display: "flex",
  flexDirection: "column",
  gap: "1.5",
  padding: "4",
  borderRadius: "md",
  border: "1px solid",
  borderColor: "border.subtle",
  background: "bg.surface",
});
const lineStyle = css({
  display: "flex",
  justifyContent: "space-between",
  gap: "3",
  fontSize: "sm",
  fontVariantNumeric: "tabular-nums",
});

/**
 * What the operator sees the instant a sale completes.
 *
 * The amount is the largest thing on screen because it is the one figure that
 * gets read aloud to the customer. Everything else — the order number, the
 * invoice number — is there to be referenced later, not now.
 *
 * "New sale" is the prominent action: at a counter the next customer is
 * already waiting.
 */
export function PosReceipt({
  sale,
  onNewSale,
}: {
  sale: CompletedSale;
  onNewSale: () => void;
}) {
  return (
    <div className={wrapStyle}>
      <span className={tickStyle}>
        <Check className={css({ height: "8", width: "8" })} />
      </span>

      <span className={amountStyle}>{formatPaisa(sale.grandTotalCents)}</span>

      <span className={metaStyle}>
        Sale complete · {sale.orderNumber}
        <br />
        Invoice {sale.invoiceNumber}
      </span>

      <div className={summaryStyle}>
        {sale.invoice.lines.map((line) => (
          <span key={line.position} className={lineStyle}>
            <span>
              {line.quantity} × {line.description}
              {line.variantName ? ` · ${line.variantName}` : ""}
            </span>
            <span>{formatPaisa(line.lineTotalCents)}</span>
          </span>
        ))}
        <span className={lineStyle}>
          <span>GST</span>
          <span>{formatPaisa(sale.invoice.totals.taxCents)}</span>
        </span>
        <span className={lineStyle}>
          <span>{sale.invoice.payment.method}</span>
          <span>{formatPaisa(sale.grandTotalCents)}</span>
        </span>
      </div>

      <div className={actionsStyle}>
        <Button size="lg" onClick={onNewSale}>
          <Plus className={css({ height: "4", width: "4" })} />
          New sale
        </Button>
        <Button variant="outline" size="lg" asChild>
          <Link href={`/admin/invoices/${sale.orderId}`}>
            <Printer className={css({ height: "4", width: "4" })} />
            Invoice
          </Link>
        </Button>
      </div>
    </div>
  );
}
