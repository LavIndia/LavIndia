# LavIndia invoice — visual specification

Transcribed from the Canva reference supplied by the owner. Canva is **not**
a runtime dependency: the design below is rebuilt as React + CSS in
`InvoiceTemplate.tsx`, so it renders from live order data, prints from the
browser and exports to PDF without any external service.

Drop the original Canva export in this folder as `canva-reference.png` for
side-by-side comparison when the template changes.

## Page

| Property        | Value                                                          |
| --------------- | -------------------------------------------------------------- |
| Size            | A4 portrait, print-safe margins                                 |
| Page background | Warm ivory / cream                                              |
| Inner card      | Pure white, holds the line-item table, generous internal padding |
| Accent          | Deep chocolate brown — the single brand colour, used everywhere  |
| Type            | Serif display for the wordmark, `INVOICE`, and totals; clean sans for body and table |

The palette must come from the existing LavIndia Panda CSS tokens rather than
hard-coded hexes, so the invoice stays in step with the storefront theme.

## Layout, top to bottom

1. **Masthead** — a solid brown square at top-left containing the lotus mark
   above the `LAVINDIA` wordmark, reversed out in cream. At top-right, the word
   `INVOICE` set large in letterspaced serif capitals, underlined by a thin
   brown rule that stops short of the page edge.

2. **Parties block** — two columns.
   *Left:* `INVOICE TO :` as a small bold brown label, then the customer name,
   then the address lines. *Right, right-aligned:* invoice number, then the
   invoice date. Any field with no value is omitted entirely, label and all —
   never rendered as an empty row or a dash.

3. **Line-item card** — white card, brown table header reading
   `NO · PRODUCT DESCRIPTION · PRICE · QTY · TOTAL`. Description carries the
   product name with the variant name and SKU beneath it in a lighter weight.
   Numeric columns are right-aligned and tabular-figure aligned so the decimal
   points stack.

4. **Payment and totals** — inside the bottom of the same white card.
   *Left:* `Payment Details :` with method and reference.
   *Right:* Subtotal, Discount, Tax, then **Total** in bold at a larger size,
   separated from the rows above by a hairline rule.

5. **Footer** — bottom-left, `Thank You` in a large brown script face, which is
   the warmest element on the page and should stay generous in size. Beneath or
   beside it sits the **greeting line** (see below). Bottom-right, right-aligned:
   business name, phone, website, address.

## The greeting

The owner asked for a warm greeting that varies between invoices. It is drawn
from a curated set in `greetings.ts` — a fixed, reviewed list rather than
generated text, so nothing unvetted can ever reach a customer's bill.

The chosen greeting is **frozen into the invoice snapshot at issue time**, for
the same reason every other field is: reprinting a two-year-old invoice must
produce a byte-identical document, which a fresh random pick each render would
break.

Selection is deterministic — derived from the invoice number — so the same
invoice always shows the same line even if the snapshot is ever rebuilt.

## Tone

The customers are billionaires. The bill should read as a piece of stationery
from a house that has been doing this for a century: restrained, warm, exactly
aligned, nothing shouting. No gradients, no drop shadows, no colour beyond the
one brown, and white space treated as a feature rather than waste.
