# GST engine — architecture and activation readiness

State: **engine OFF** (`gst_business_profile.engineMode`). Everything described here is built and tested locally.
Nothing has been applied to Supabase or deployed.

## Layers
1. **Engine** (`src/modules/gst/engine/`) — pure, DB-free. Integer paise and basis points, BigInt intermediates, half-up rounding.
   CGST + SGST = IGST = rate. Inclusive/exclusive, discounts, shipping and COD (NONE / FOLLOWS_GOODS / SEPARATE), cess,
   mixed baskets (PROPORTIONAL / HIGHEST_RATE), credit notes at the original rate version (last slice takes the remainder).
2. **Masters & workflow** — rates (versioned, effective-dated, notification-backed, DRAFT until approved), HSN/SAC, product
   profiles and classification (NEEDS_PRODUCT_INFORMATION → NEEDS_ACCOUNTANT_APPROVAL → VERIFIED/REJECTED), supplier
   documents, rate proposals and source watches.
3. **Integration** — `quoteCartWithGst` is called from checkout (`priceCart`, `/api/orders/create`), POS and order creation.
   OFF: untouched. SHADOW: computes, records the difference, changes nothing. ENFORCE: only VERIFIED classifications and
   approved rates; refuses an unclassified line (no default rate) and requires verified registration plus activation checks.
4. **Invoices** — `gst_invoice_details` written beside (never in) the existing `invoices` table, in a SAVEPOINT so it can never
   block an invoice; `gst_credit_notes` share the existing credit-note number series.
5. **Reports** — sales register, GSTR-1 tables (B2B, B2C, CDNR, CDNUR, HSN), tax liability, GSTR-3B comparison, CSV export.
   Nothing files a return.
6. **Admin UI** — `/admin/gst` (overview), `/business`, `/classification`, `/rates`, `/monitoring`, `/invoices[/orderId]`,
   `/reports`, `/updates`; customer invoice at `/account-pages/gst-invoice/[orderId]` (ownership-checked), linked from My Orders.

## Database (additive only; 17 tables, 14 triggers; existing tables untouched)
| Migration | sha256 |
|---|---|
| 20261124100000_gst_tables | df2538e42e5962d7da91327799fa6ba2f515ddd188c8d68330831b95d463275b |
| 20261124100100_gst_constraints | 23c0937d767fb14f121829edf1b92a090f21bd106b0f19fd77fa84f8f0690583 |
| 20261124110000_gst_operations_tables | c6a3e34caea56fd0967facc4b6de43907530056a16971d267d31c05cd8a10b8f |
| 20261124110100_gst_operations_constraints | abf3903bc0dbc599f3c14709125aea6d85bfe1ee95c6e16126fca2c723add347 |

Protections in the database itself: check constraints; overlap prevention for approved rates; used-rate immutability;
append-only audit trail and credit notes; credit-note cap under advisory lock; issued-invoice immutability.
`payment_links` schema drift was left alone.

## API (`/api/admin/gst/*`, all gated by `gst:read|write|approve`)
overview · profile (GET/PUT/POST verify|mode) · config · masters · products[/id] · material-sheet · documents[/id] · monitor ·
invoices[/orderId] · reports · updates · pending. Customer: `GET /api/user/orders/[orderId]/gst-invoice`.

## Test results (local)
| Suite | Result |
|---|---|
| `verify-gst-engine.ts` (446 independent Python-Decimal fixtures + credit notes, place of supply, GSTIN) | 40/40 |
| `verify-gst-format.ts` (amount in words, rate labels) | 21/21 |
| `verify-gst-workflow.ts` (profile, composition, approvals, rates, CSV, reports, monitoring) | 66/66 |
| `verify-gst-integration.ts` on a scratch DB (OFF/SHADOW/ENFORCE, activation, invoices, credit notes, history unchanged) | 46/46 |
| `scripts/gst/ops-db-tests.sh` (constraints, triggers, 6-way credit-note race) | 64/64 |
| `verify-gst-security.ts` (static gating of every route + live unauthenticated requests, 4 methods each) | 123/123 |
| Existing regression with engine OFF: checkout 13, POS 23, order-status 28, credit-notes 50, promotions OK | pass |
| `tsc --noEmit`, `eslint` on all new code, production `next build` (in a copy) | clean / success |

Not run: authenticated non-admin requests (needs a customer session); a browser walk-through of the admin screens (the local
dev server's CSS worker was crashed when last checked — existing pages returned 500 too — so the screens are verified by type
check, lint and a successful production build, not visually). Unrelated failure: `verify-inventory.ts` fails one check
("RECEIVE movement recorded before/after"); reproduced on a pre-GST copy, so it predates this work.

## Production activation readiness — **not ready to enforce**
Software: complete. Blocked only by information and approvals: see MISSING_INFORMATION.md (verified GSTIN/state, accountant
decisions, material for 18 pieces, verified notifications, approved rates, clean shadow run, e-invoicing answer).

### Rolling the schema to Supabase later (nothing done yet)
1. Back up production. Use the direct (non-pooled) connection.
2. `prisma migrate status` against production; decide the `payment_links` drift separately.
3. Apply the four migrations in order with `psql -1 -v ON_ERROR_STOP=1`, then `prisma migrate resolve --applied` for each.
4. Enable row-level security on the 17 new tables (Supabase exposes `public` through its API).
5. Leave `engineMode` OFF; move to SHADOW only after classification work, and ENFORCE only when every check passes.
