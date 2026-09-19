# LavIndia — backlog

Things deliberately not built yet, with enough context to pick them up cold.

Each entry says what it is, **why it was deferred**, and what it would take —
so a future decision is made on the same information, not rediscovered.

---

## 1. Automatic UPI payment confirmation

**Status:** not possible with the current approach. Needs a payment gateway.

### The problem

The counter bill shows a `upi://pay` deep-link QR. It works — the customer
scans, their app opens with the exact amount filled in, they pay — but the
money goes straight to the merchant's UPI app and **this system never hears
about it**. There is no callback in the UPI deep-link specification.

That has two consequences:

- The cashier must confirm "Payment received" by eye, from the customer's
  phone. Nothing stops them confirming a payment that never arrived.
- We cannot know the payer's UPI ID or the bank reference automatically, so
  `Payment.payerVpa` and `Payment.utr` are typed in by hand if at all.

### What would fix it

Razorpay's [QR Codes API](https://razorpay.com/docs/payments/qr-codes/) —
already a dependency of this project for online checkout. It creates a
**dynamic QR** server-side and fires a **webhook** the moment the customer
pays, carrying the payer's VPA and the UPI reference.

That turns the flow from:

    cashier squints at customer's phone → taps Confirm

into:

    customer pays → webhook arrives → screen confirms itself

### Shape of the work

1. `payments/razorpay/qr-codes.ts` — create a QR for an amount, close it
   after payment or timeout.
2. `POST /api/webhooks/razorpay` — verify the signature, match on the QR id,
   mark the sale paid, store `payerVpa` and `utr`.
3. POS bill step subscribes (poll or SSE) and advances itself on confirmation.
4. Fall back to the current deep-link QR plus manual confirmation whenever
   Razorpay is not configured, so the shop can still trade.

**Why deferred:** it needs a live gateway account, and the owner has
confirmed there is none. The `RAZORPAY_KEY_ID` in `.env` is a **test** key
(`rzp_test_…`), which cannot take real money, and Razorpay's QR feature has to
be enabled on a live, KYC-completed account. A publicly reachable HTTPS URL is
also required for the webhook, which does not exist in development.

**Decision (19 Sep 2026):** skip the gateway for now and keep selling with the
manual confirmation. This is explicitly NOT a blocker on trading — the counter
flow works today:

- The bill shows a `upi://pay` QR built from the merchant VPA in Settings,
  with the amount already filled in, so the customer cannot pay the wrong
  figure.
- The cashier checks the customer's app and taps **Payment received**. That
  one tap is what writes the payment as `COMPLETED`, commits the stock and
  allocates the invoice number — all inside a single transaction.

What is lost without the gateway is only *automatic* confirmation, and with it
the automatic capture of the payer's VPA and the bank reference. There is no
partial workaround worth building: the UPI deep link is a bank-to-bank
transfer and nothing in the NPCI specification ever calls back to the
merchant's server, so "confirm it automatically" and "use a payment provider"
are the same sentence. Statement polling and SMS scraping are the only other
routes and both are too fragile to put behind a till.

The data model is already in place (`Payment.payerVpa`, `Payment.utr`, and the
invoice snapshot carries both), so whenever a live account does exist this is
purely additive — no migration and no change to how a sale is recorded.

---

## 2. Stock leaves "On hand" at payment, not at fulfilment

**Status:** deliberate divergence from retail convention.

[Shopify's inventory states](https://help.shopify.com/en/manual/products/inventory/fundamentals/inventory-states)
keep a sold-but-unshipped piece **On hand**, flagged *Committed*, until it is
picked and shipped. Ours deducts at payment.

For a counter sale that is correct — the piece physically left. For an online
order shipping tomorrow it is not: a shelf count will read one lower than the
shelf until dispatch.

**What it needs:** a fulfilment step in the order flow, at which point stock
converts from Committed to gone. It belongs with that work rather than as an
isolated change, because "fulfilled" has to mean something first.

---

## 3. Per-unit serial tracking

**Status:** designed, not built. See `src/modules/inventory/SERIALISATION.md`.

Jewellery systems normally track high-value pieces individually — each with
its own certificate, appraisal, metal purity and stone grade. Ours counts
quantities.

`ProductVariant.trackingMode` already accepts `SERIAL`, and `StockLine`
already accepts `serialNumbers` (rejected today rather than ignored). The
full design is written up so adding it is additive rather than a redefinition
of what an inventory item is.

**Why deferred:** the owner chose the hook over the machinery. Revisit when
certified stones are actually being sold.

---

## 4. Camera barcode scanning

**Status:** hardware scanners work; phone cameras do not.

A USB or Bluetooth scanner is a keyboard and needs no library — that path is
built and tested. Scanning with a phone camera needs a decoder.

**What it needs:** the `barcode-detector` package, which polyfills the native
`BarcodeDetector` API and falls back to ZXing WebAssembly. Native is 2–3×
faster and reads angled codes, but Safari has never shipped it — and on iOS
every browser is WebKit, so an iPad at the counter needs the WASM path.

`ScanSource` already declares `CAMERA` alongside `HARDWARE_SCANNER` and
`MANUAL_ENTRY`, so adding it changes one module and no screens.

---

## 5. Invoice template from the Canva design

**Status:** engine done, visual template not built.

The invoice *data* is complete and frozen in `Invoice.snapshot`, numbering is
sequential per financial year, and the greeting is chosen and frozen at issue
time. What is missing is the rendering — the design transcribed in
`src/modules/billing/invoices/reference/DESIGN.md`.

Until it exists, `/admin/invoices/[orderId]` (linked from the POS receipt)
returns 404.

---

## 6. Finer-grained roles

**Status:** single ADMIN role.

`requireAdmin(capability)` already takes a capability —
`inventory:write`, `pos:override-price`, `billing:void` and so on — and every
call site names the one it needs. Today all of them resolve to "is an admin".

**What it needs:** a role model and a capability map. The call sites do not
change, which was the point of naming capabilities up front.

---

## 7. Label layout polish

**Status:** functional, not finished.

Space is budgeted properly and the print scale bug is fixed, but the owner
flagged the visual balance as needing another pass. Deferred by agreement to
get the remaining phases moving.

---

## 8. ESLint is not configured

**Status:** pre-existing, unrelated to this work.

`npm run lint` fails — ESLint 9 expects `eslint.config.js` and the repo has
only the older format. Nothing is being linted in CI or locally.

---

## 9. Supabase recovery

**Status:** open, and time-sensitive.

The production Supabase project holds no product data. Restoring from
Dashboard → Database → Backups is the only route that recovers real product
names, prices and order history; retention windows are short.

Local Postgres currently holds the only catalog, and it is demo data.

---

## 10. An online order is never given an invoice

**Found:** 19 Sep 2026, during the end-to-end manual test of a storefront sale.

A counter sale and a web sale are settled by different code, and only one of
them raises a bill:

- **Counter (`src/modules/pos/pos-service.ts`)** — the sale, the stock
  movement and the invoice are written in one transaction, so a walk-in
  customer always leaves with `INV/26-27/…`.
- **Online COD (`src/app/api/orders/create/route.ts`)** — reserves stock and
  immediately commits it, but calls nothing in the billing module. No invoice
  row is created, ever.
- **Online prepaid** — `src/app/api/payment/verify/route.ts` is the only
  online path that could raise one.

Verified against order `LVI-MU8IJHMG-XHKE` (COD, ₹3,297, stock moved 16 → 14):
the order, the items, the payment and both ledger movements are all correct,
and `invoices` has no row for it. On the Orders screen that order shows "—"
in the invoice column while the walk-in sale beside it shows its number.

**Why it matters:** a COD delivery is a completed sale that must travel with a
tax invoice. It is also a gap in the financial-year sequence — the numbering
is meant to cover every sale, not only the ones made at the counter.

**Shape of the work:** call `billingService.issueInvoice` from the same
transaction that commits the stock, exactly as the POS service does, so the
invoice cannot exist without the sale or the sale without the invoice. The
open question is *when* for a COD order — at placement, or on delivery, which
is when the money actually changes hands. That is a tax question for the
owner's accountant, not a code decision.

---

## 11. The website charges no GST; the counter charges 3%

**Found:** 19 Sep 2026, same test.

The counter applies `GST_RATE_BPS = 300` and shows the tax on the bill. The
storefront checkout posts `taxCents` from the client and the order above was
stored with `taxCents = 0` — the same ring, bought two ways, is taxed
differently. The subtotal and shipping are right in both.

Whatever the correct treatment is, it must be the same on both channels and it
must be computed on the server: `taxCents` currently arrives in the request
body, so it is a client-supplied figure on a tax field. The pricing already
exists in one place (`src/modules/orders/pricing.ts`); the checkout route
should use it rather than trusting what is posted.

---

## 12. Unknown URLs render "Category Not Found" instead of a 404

**Found:** 19 Sep 2026, while opening `/lavindia/login`.

The storefront's catch-all `[category]` route matches any single-segment path,
so a mistyped or stale URL shows a styled "Category Not Found" page instead of
a real 404. It returns a 200 as well, which means search engines will index
whatever is typed. The fix is for that route to call `notFound()` when the
slug matches no category.

**Not urgent:** the home page, all three categories and every product page
resolve correctly — this only affects paths that do not exist.
