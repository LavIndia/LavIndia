# LavIndia Functional Documentation

2026-09-18 · @Someone

## Overview

LavIndia is a single Next.js application that serves both the public jewellery storefront and the admin management portal from one codebase and one PostgreSQL database — there is no separate backend service or admin app.

**Tech stack**

| Layer | Technology |
| --- | --- |
| Framework | Next.js 15 (App Router, Turbopack in dev), React 19, TypeScript |
| Database / ORM | PostgreSQL via Prisma 6 |
| Auth | NextAuth v5 (beta) with the Prisma adapter; credentials (username/email/mobile + password) and session cookies |
| Styling | Panda CSS (atomic CSS-in-JS, codegen'd at build/dev time) + Radix UI primitives |
| Forms / validation | React Hook Form + Zod |
| Data fetching (client) | TanStack Query in places; most storefront pages are server-rendered with Prisma queries or `unstable_cache` |
| Payments | Razorpay (order creation, payment capture, signature verification) |
| Media storage | ImageKit (remote CDN storage for product/category/banner images) when `IMAGEKIT_ENABLED=true`, else local files under `public/assets` |
| Notifications / UI | Sonner (toasts), Recharts (admin analytics charts), embla-carousel (banners/galleries) |
| Password hashing | bcryptjs |

**Two audiences, one app**

- **Storefront** (`src/app/**` public routes, e.g. homepage, `/shop-pages/**`, `/[category]`, `/account-pages/**`): customer-facing browsing, cart, wishlist, checkout, account management.
- **Admin portal** (`src/app/admin/**` and `src/app/api/admin/**`): catalog, content, marketing, and order management, gated by `session.user.role === "ADMIN"` checked in every admin API route (no separate RLS layer — Prisma is queried directly, authorization is enforced in route handlers).

Both surfaces are held to an ultra-luxury standard (the target customers and admin operators are treated as high-net-worth users), so functional correctness and polish matter on both sides equally.

## Data model

All models live in `prisma/schema.prisma`, mapped to snake\_case tables. Prices are always stored as integer paisa/cents (never floats) to avoid rounding errors.

**Catalog**

| Model | Purpose | Key fields | Notes |
| --- | --- | --- | --- |
| `Category` | Top-level product grouping (Earrings, Necklaces, Rings…) | `name`, `slug`, `image`, `isFeatured`, `featuredOrder` | Deleting a category cascades to its `Product`s at the DB level, but the admin API blocks the delete while the category still has products (see Known behaviors) |
| `Product` | A sellable item | `slug`, `priceCents`, `compareAtCents`, `discountPercent`, `stock`, `sku`, `isActive`, `isFeatured`, `isLimitedEdition`, `isPublished` | Only shown storefront-side when `isActive && isPublished`; belongs to one `Category` |
| `ProductImage` | Gallery images for a product or one of its variants | `url`, `alt`, `position`, `isPrimary`, `variantId?` | `variantId` null = general product gallery image; set = belongs to that variant's own gallery |
| `ProductVariant` | Color/size/material variant of a product | `name`, `priceCents?`, `sku`, `color`, `size`, `material`, `stock`, `isActive` | Deleting a variant does **not** delete its images — they fall back to the product's general gallery (`onDelete: SetNull`) |
| `Collection` / `ProductCollection` | Named groupings of products for homepage merchandising (join table) | `name`, `slug`, `imagePath` | Many-to-many with `Product` |
| `Review` | A customer's star rating + comment on a product | `rating`, `comment`, `isVerifiedPurchase` | One review per user per product (`@@unique([productId, userId])`) |
| `ProductEvent` | Anonymous product-engagement analytics | `type` (`VIEW`\|`ADD_TO_CART`), `sessionId`, `durationMs` | Tracked per browser session (not per account) for both signed-in and anonymous shoppers; powers Admin → Analytics → Product Engagement |

**Users, auth & accounts**

| Model | Purpose | Key fields |
| --- | --- | --- |
| `User` | Account record | `username` (unique), `email?`, `mobile?`, `password` (bcrypt hash), `profilePicture`, `role` (`ADMIN`\|`CUSTOMER`) |
| `Account` | OAuth provider link (NextAuth) | `provider`, `providerAccountId`, tokens |
| `Session` | Server-side session (NextAuth Prisma adapter) | `sessionToken`, `expires` |
| `LoginEvent` | Login history shown on the customer's own "Active Sessions" page | `ipAddress`, `userAgent`, `browser`, `os`, `deviceType`, coarse `city`/`region`/`country` (IP-derived, not GPS) |
| `Address` | Saved shipping address | `fullName`, `mobile`, `addressLine1/2`, `city`, `state`, `pincode`, `country`, `isDefault` |

**Cart, wishlist & orders**

| Model | Purpose | Key fields |
| --- | --- | --- |
| `Cart` / `CartItem` | DB-backed cart record (see Cart & Wishlist section for how/when this is actually used vs. the client-side cart) | `quantity`, `priceCents` (price snapshot at add-time) |
| `WishlistItem` | Saved-for-later product | unique per `(userId, productId)` |
| `Order` | A placed order | `orderNumber`, `totalCents`, `status` (`PENDING`→`PROCESSING`→`SHIPPED`→`OUT_FOR_DELIVERY`→`DELIVERED`, or `CANCELLED`/`REFUNDED`), `paymentStatus`, `paymentMethod`, `discountCode`/`discountCents` (coupon snapshot) |
| `OrderItem` | Line item on an order | `quantity`, `priceCents`, `name`, `image` — **snapshotted** at order time so the order stays historically accurate even if the product is later edited/deleted |
| `Payment` | Razorpay payment record, 1:1 with `Order` | `razorpayOrderId`, `razorpayPaymentId`, `razorpaySignature`, `status`, `method` |
| `OrderTracking` | Timeline of status updates for an order | `status`, `location`, `description`, `updatedBy` |

**Marketing & homepage content**

| Model | Purpose | Key fields |
| --- | --- | --- |
| `HeroBanner` | Homepage hero carousel slide | `imagePath`, `linkUrl`, `order`, `active`, optional scheduling (`startDate`/`endDate`/recurrence) |
| `PromoBanner` | Top-scroll / free-gift / special-offer banners | `type`, `message`, `bgColor`/`textColor`, same scheduling fields |
| `BudgetTier` | "Shop under ₹X" homepage tiles | `title`, `maxPrice`, `gradient`, `icon` |
| `HomePageSection` | Controls visibility/order of each homepage section | `name` (hero, explore, bestsellers, budget, free\_gifts, new\_arrivals, trust\_badges, coupons), `isVisible`, `order` |
| `Discount` | Coupon code | `code`, `discountType` (`PERCENTAGE`\|`FIXED_AMOUNT`), `discountValue`, `minPurchase`, `maxDiscount`, `usageLimit`/`usedCount`, scheduling + recurrence fields |
| `SiteSettings` | Singleton site-wide config | business info, social links, trust-badge copy, SEO meta, footer copyright |

HeroBanner, PromoBanner and Discount all share the same recurrence convention (`isRecurring`, `recurrenceType`: DAILY/WEEKLY/MONTHLY, `recurrenceDaysOfWeek`, `recurrenceDayOfMonth`, `recurrenceStartTime`/`EndTime`), evaluated by `src/lib/scheduling.ts`.

**Filters & misc**

| Model | Purpose |
| --- | --- |
| `Filter` / `FilterOption` / `FilterCategory` | Product-listing filters (Price Range, Metal Type, Stone Type…), each with selectable options and an assignment to one or more categories |
| `AuditLog` | Records every admin CREATE/UPDATE/DELETE action with `adminId`, `entity`, `entityId`, and JSON metadata — the basis of the admin activity trail |
| `NewsletterSubscriber` | Email-only newsletter signup list |

## Authentication & accounts

Auth runs on NextAuth v5 with a Prisma adapter and **JWT sessions** (`session.strategy: "jwt"`, `src/lib/auth.ts`) — the `Session` table exists in the schema but isn't used for session storage since JWT strategy bypasses it.

**Sign up** happens inside the Sign Up tab of the `AuthDialog` modal (there is no dedicated `/signup` page), posting to `POST /api/auth/signup`. Fields: full name, username, and either an email or a 10-digit mobile (toggle, not both). Validation: username 3–20 chars alphanumeric/underscore, blocked against a reserved-word list (admin, root, support, lavindia…); password ≥ 8 chars with at least one lowercase, one uppercase, one digit; duplicate checks return field-specific errors (username taken / email registered / mobile registered). Passwords are hashed with bcrypt (cost 10). **Email/mobile verification is not implemented** — the schema has `emailVerified`/`mobileVerified` columns but nothing ever sets them; accounts are usable immediately. On success the client auto-signs-in the new user via `signIn("credentials", { redirect: false })` so no second login step is needed. New accounts are always created with role `CUSTOMER` — there is no self-service way to become `ADMIN`.

**Sign in** offers three paths, all from the same `AuthDialog` modal:

- **Password** — a single "identifier" field accepting email OR mobile (not username, despite username being a real unique field); the server regex-detects which one was entered.
- **OTP** — request via `POST /api/auth/otp/request`, then verify via a `signIn("otp", { identifier, otp })` provider. Codes are 6-digit, 5-minute TTL, 5 max attempts, stored in an **in-memory `Map`** (`src/lib/otp-store.ts`) — not Redis/DB-backed, so it won't survive a server restart or work across multiple server instances. **The OTP is never actually delivered to the user** — it's only written to the server console (`console.warn`); no SMS/email provider is wired up, so this login path is built end-to-end in the UI but is not usable by a real customer today.
- **Google OAuth** — fully functional, `allowDangerousEmailAccountLinking: true` so a Google sign-in links to an existing account with the same email; rejected if Google reports the email as unverified.

There is no `/login` page — NextAuth's `pages.signIn` points at `/`, and in practice the `AuthDialog` modal is the only sign-in surface, opened via `useAuthDialog().requireAuth()` (e.g. when the header's account icon is clicked while logged out, or to gate an action like add-to-cart behind login).

**Forgot password is not implemented** — the link shows a toast ("coming soon, contact support") and does nothing else. There is no reset-token flow anywhere in the codebase.

**Role gating** is layered three times, independently: `src/middleware.ts` redirects unauthenticated/non-admin visits to `/admin/**` pages; `src/app/admin/layout.tsx` re-checks `session.user.role === "ADMIN"` server-side; and **every individual admin API route** under `src/app/api/admin/**` independently calls `auth()` and checks the role again (this per-route check is what actually protects the admin API, since the page middleware doesn't cover API routes).

**Login history**: every successful password, OTP, or Google sign-in writes a `LoginEvent` (IP, browser/OS/device type parsed from the user-agent, coarse city/region/country from edge headers only — no GPS, no third-party geo-IP lookup). Shown read-only on the Profile page's Security tab (`GET /api/user/login-events`, last 20, newest first, most recent marked "Current"). There's no "sign out this device" action — consistent with JWT sessions having no server-side record to revoke.

**Logout**: client-side `signOut({ redirect: false })` followed by a hard `window.location.assign("/")` to fully clear state.

**Account pages** all live as tabs inside one page, `/profile` (`src/app/account-pages/profile/page.tsx`): Profile, Addresses, Orders, Wishlist, Security.

- *Profile tab*: name/username/email/mobile are shown **read-only** — there is no way to edit them after signup. The only editable item is the profile picture (upload ≤ 5MB, jpeg/png/webp, stored via ImageKit at `/assets/User/{userId}-{timestamp}`; delete removes both the `User.profilePicture` field and the stored file).
- *Addresses tab*: full CRUD via `/api/user/address`; marking an address default automatically unsets `isDefault` on the user's other addresses so exactly one stays default.
- *Orders tab*: read-only order history with a color-coded status badge; no cancel/reorder action here.
- *Wishlist tab*: add is idempotent (upsert on the `[userId, productId]` unique key, so re-adding is a no-op not an error), remove deletes the row; each card links to the product.
- *Security tab*: the login-history list described above.

**Known inconsistency**: the header's account dropdown links to `/addresses` and `/wishlist` as if they were standalone pages, but no route or rewrite exists for either — only `/profile` and `/orders` actually resolve (via `next.config.ts` rewrites to `account-pages/**`); `/addresses` and `/wishlist` currently fall through to the app's catch-all `/[category]` dynamic route instead of reaching the intended tab.

**Account deletion/deactivation is not implemented** — no UI, API, or soft-delete field exists; removing an account today requires a direct database operation.

## Storefront browsing & discovery

### Homepage (`src/app/page.tsx`, `src/lib/homepage-data.ts`)

Section order/visibility is admin-controlled via `HomePageSection` (name, title override, `isVisible`, `order`); the page filters to visible sections and renders them via a name→component lookup, so an admin can hide, reorder, or retitle sections without a deploy. If the table is empty on first run, 8 default sections are auto-seeded (hero, explore, bestsellers, budget, free\_gifts, new\_arrivals, trust\_badges, coupons). `TopPromoBanner`, header and footer always render outside this list.

| Section | Data source | Selection logic |
| --- | --- | --- |
| Hero carousel | `HeroBanner` where `active: true` | Ordered by `order`; storage is synced into the DB before every read (see Known behaviors) |
| Top-scroll / free-gift banners | `PromoBanner` where `isActive` + `type` + in date window | Free-gifts section only ever shows the first match |
| Explore / featured categories | `Category` where `isFeatured: true` | Ordered by `featuredOrder`; falls back to the oldest published product's primary image when a category has no image set; zero featured categories → falls back to a single "Earrings" link |
| Bestsellers | `Product` with any order-item history, ordered by order-item count desc | If nothing has ever sold, falls back to the 12 most recent active+published products — the "Bestseller" badge only shows on the real-sales set, never the fallback |
| Shop under budget | `BudgetTier` where `isActive` | Each tile links to `/shop/budget?max=<price>` |
| New arrivals | `Product` created in the last 30 days | Shared 30-day window (`src/lib/product-tags.ts`) reused by category pages and `/api/products` so "New Arrival" means the same thing everywhere |
| Trust badges | Single `SiteSettings` row | COD badge, "Loved by N customers" + rating, support-hours line — each shown only if its underlying value is set |
| Coupons | `Discount` where `isActive` and inside `startDate..endDate` | Click-to-copy code; **note:** this check only looks at the overall campaign window — it ignores the same `Discount` rows' `isRecurring`/day-of-week/day-of-month/time fields, so a coupon scheduled for "Fridays only" would still show on the homepage every day within its campaign window |

The whole payload is cached together (`unstable_cache`, tag `"homepage"`, 60s safety-net revalidate) — any admin change to banners, categories, products, budget tiers, discounts, settings, or section order busts this one tag.

### Category / listing pages (`src/app/[category]/**`, `CategoryCollection.tsx`)

One dynamic route (`/[category]`) serves every category with the same template. Server-render fetches the category, its first page of products (up to 30, tag `["products","category-<slug>"]`), and its filters (tag `["filters","category-<slug>"]"`) in parallel — all 60s-cached. An unknown slug shows a "Category Not Found" page with header/footer still rendered.

- **Filters panel**: a price range slider (fixed ₹100–₹30,000 regardless of the category's actual price spread) plus one checkbox group per admin-configured `Filter`/`FilterOption` for that category. Changes are staged locally and only applied when "Apply Filters" is clicked; active filters show as removable badges above the results.
- **Sort**: Newest First, Price low→high, Price high→low, Name A→Z.
- **Pagination is infinite scroll**, not numbered pages — scrolling near the bottom fetches the next page from `GET /api/products`; there is no page-number UI.
- Empty state: "No products found in {category}" with a Clear Filters button; loading uses skeleton cards.
- Filter matching caveat: a `FilterOption.value` is matched directly against a product's active variants' `color`/`material`/`size` (case-insensitive) — there's no explicit mapping enforced between a filter's declared type and which variant attribute it checks, so an option only works if its `value` string exactly equals a real variant attribute value.

### Search

There is no dedicated search page — it's a slide-out panel from the header, debounced 300ms, active once the query is ≥2 characters. It matches product **name only** (case-insensitive substring), not description or category, capped at 20 results, sorted **alphabetically** (not relevance-ranked). Results show a computed "% OFF" badge when a compare-at price exists, and clicking one navigates straight to the product page.

## Product detail page

Route `/shop-pages/product/[id]` accepts either a product's id or its slug everywhere. The page shell (`page.tsx`) only handles SEO `generateMetadata` (title/description/OpenGraph/Twitter card from a cheap cached lookup); the actual UI is a client component, `ProductPageClient.tsx`, which independently fetches the full product via `GET /api/products/[slug]` and its reviews via `GET /api/products/[slug]/reviews`.

- **Gallery**: a carousel of all product images with a thumbnail row (shown only when there's more than one image); clicking/tapping the main image (or Enter/Space) opens a full-size lightbox. Desktop gets a slow CSS-only "dwell zoom" on hover.
- **Variants**: clicking a variant swaps the displayed price, and the material/color/size/stock details shown, and resets the quantity stepper to 1. A variant with zero stock is shown disabled. **It does not swap the gallery images** — the gallery always shows the product's general images, even though the schema supports a variant-specific image set that isn't used on this page.
- **Price**: shows the price and, if a compare-at price is set, a strikethrough original price — there is no "% off" badge on this page (the site search results do show one, computed the same way).
- **Stock status**: 0 → red "Out of Stock" badge, add-to-cart disabled; 1–10 → amber "Only N left in stock!"; quantity stepper is clamped to available stock. *Caveat*: the product-detail API response only carries stock on each variant, not a top-level product stock field — for a product with no variants at all, this can make the page compute stock as `0` ("out of stock") even if the product actually has stock set at the product level.
- **Add to cart**: gated behind sign-in (opens the login dialog if needed); button label cycles Out of Stock → Max in Cart → "Added (n)" → Add to cart.
- **Wishlist**: heart toggle, requires sign-in, calls the wishlist API directly (see Cart & Wishlist section).
- **Share**: native share / copy-link button.
- **No "related products" or "you may also like" section exists** on this page today.

### Reviews

Submission requires sign-in, a 1–5 star rating, and a non-empty comment (≤2000 chars). "Verified Purchase" is determined by checking whether the signed-in user has any order line item for that product (regardless of the order's payment/delivery status). A user can only ever have one review per product — resubmitting **overwrites** their previous rating/comment rather than adding a second review (enforced by a unique `(productId, userId)` constraint and an upsert). Reviews list newest-first with no pagination and no sort-by-rating option; an average rating + count is shown above the list only once at least one review exists. Writing a review is disabled with a "Sign in to write a review" placeholder when signed out.

### Product engagement tracking

Every product view fires one `VIEW` event carrying the real time-on-page (measured from mount to tab-hide/unmount, sent via `navigator.sendBeacon`), and every add-to-cart fires one `ADD_TO_CART` event (no corresponding remove/decrement event). Events carry an anonymous per-tab session id (not tied to an account), so both signed-in and anonymous browsing is captured. The ingestion endpoint silently drops any `VIEW` shorter than 1 second so page reloads/bounces don't pollute the data. This feeds the admin's Analytics → Product Engagement view; it is a real, populated dataset, not a stub.

## Cart & wishlist

### Cart — client-side only, not database-backed

The schema defines `Cart`/`CartItem` models, but **nothing in the codebase reads or writes them** — they're dead schema. The real cart lives entirely in `localStorage` (key `lavishindia_cart_v1`), managed by `CartProvider.tsx`:

- `addItem` matches existing lines by `(productId, variantId)`; a match increments quantity, otherwise a new line is appended.
- `removeItem` filters out a line; `updateQty` sets quantity and auto-removes the line if it drops to ≤0.
- Totals (`totalCount`, `totalPrice`) are derived client-side from the stored lines.
- **Consequence**: the cart does not sync across devices or browsers, is lost if browser storage is cleared, and is per-browser-profile even for a signed-in user — there is no server-side merge-on-login. It does survive page reloads and tab closes on the same browser (localStorage, not sessionStorage).
- The cart trigger is a header icon with a badge (shown only when the cart isn't empty) that opens a slide-over drawer: per-line image/name/variant/price, a quantity stepper, a delete button, a subtotal, a "Clear" action, and a Checkout button (disabled when empty).
- `AddToCartButton` (used on cards and the product page) requires sign-in before any add, and caps additions against whatever `stock` value was rendered on that page — a purely client-side, point-in-time check, not a live re-verification against the database.

### Wishlist — genuinely database-backed

Backed by `WishlistItem` end to end. Adding is idempotent (upsert on the unique `(userId, productId)` key, so adding an already-wishlisted product is a silent no-op, not an error); removing deletes the row. Used from product cards, the product detail page, and the account Wishlist tab, all against the same `GET/POST/DELETE /api/user/wishlist` endpoints; every add/remove requires sign-in and shows a toast on success or failure.

## Checkout & orders

### Checkout flow (`/checkout`)

1. **Prefill**: signed-in users get their email/name pre-filled, and their default (or first) saved address auto-fills the shipping fields — there's no address-picker UI, just one editable form.
2. **Shipping**: two hardcoded options, Standard ₹99 / Express ₹199 — no dynamic rate calculation. Tax is a hardcoded ₹0 placeholder; GST/VAT is not implemented.
3. **Coupon entry**: validated live against `POST /api/discounts/validate`, which checks active/date-window/**recurrence** (day-of-week, day-of-month, time-of-day, evaluated in fixed IST)/minimum purchase/usage limit, in that order. Discount amount is percentage-of-subtotal (capped at `maxDiscount` if set) or a flat amount, always clamped to `[0, subtotal]`. Applying a coupon is re-validated automatically whenever the cart total changes, so a coupon that becomes ineligible (e.g. cart drops below the minimum) is silently dropped rather than left showing a stale discount. **The discount amount is never trusted from the client** — only the code is sent to order creation; the server independently re-validates and recomputes it inside the order transaction, specifically to prevent tampering.
4. **Payment method**: Cash on Delivery (default) or Razorpay (card/UPI/wallet).
5. **Placing the order**: client-side requires email/name/address/city and a non-empty cart; a *new* address row is created from the form on every checkout (not reused from an existing saved address, even if identical), then `POST /api/orders/create` is called with the address id, items, totals, and coupon code.

### Order creation (server-side, one transaction)

- Order number: `LVI-<timestamp>-<random>`.
- Shipping fee is **recomputed server-side** from the shipping method (ignoring whatever the client sent), same tamper-prevention pattern as the discount.
- If a coupon was applied, it's re-fetched and re-validated *inside* the transaction (so eligibility and the usage-count increment are atomic against concurrent use of the same code) and `Discount.usedCount` is incremented — **on every successful order regardless of payment method**, including COD and even an as-yet-unpaid/unverified Razorpay order, so an abandoned Razorpay payment still consumes one use of a limited-use coupon.
- `OrderItem` rows snapshot the product's name/image/price at order time, so later product edits never retroactively change historical orders.
- COD orders start at `status: PROCESSING` (skipping `PENDING`, since there's no payment gate) with `Payment.status: COMPLETED` immediately; Razorpay orders start at `status: PENDING` with `Payment.status: PENDING` until verified.
- **No stock/inventory decrement happens anywhere in order placement** — stock is only ever changed from the admin product screens, never by checkout. An item that goes out of stock between add-to-cart and place-order is still accepted with no server-side guard.
- **No order-confirmation email or SMS is sent** — there is no email/SMS provider wired into the order/payment code at all. The on-screen `/order-success` page's copy claims "a confirmation email has been sent," which does not correspond to any actual code; confirmation is purely the on-screen page.

### Razorpay payment verification

After the checkout widget's success callback, the client calls `POST /api/payment/verify`, which recomputes an HMAC-SHA256 signature server-side and compares it to the one returned by Razorpay; a mismatch marks the payment `FAILED` and leaves the order `PENDING`/unpaid. **There is no Razorpay server-to-server webhook** — payment confirmation depends entirely on the browser completing this verify call. If the tab closes or the network drops right after a successful charge but before this call finishes, the order stays `PENDING`/unpaid in the database even though Razorpay actually captured the money, with no reconciliation job to catch it. On cancellation or failure, the customer is routed to `/order-failed`; the dangling order is never auto-cancelled, and the only recovery path is starting checkout over (the cart is left intact since it's only cleared on success).

### Order status lifecycle

`PENDING → PROCESSING → SHIPPED → OUT_FOR_DELIVERY → DELIVERED`, plus terminal `CANCELLED`/`REFUNDED`. The only thing that ever changes an order's status after creation is an admin action (`PATCH /api/admin/orders/[id]`, see Admin section) — there is no carrier integration, cron job, or webhook driving any of these transitions automatically, and the endpoint applies no state-machine rules (an admin can set any status from any other status at any time, including jumping straight to `DELIVERED` or moving a cancelled order back). **Customers cannot cancel their own order** — there is no customer-facing cancel action anywhere.

Every status change and the original order-placement/payment-confirmation events write an `OrderTracking` row — but **none of that history is currently shown to the customer**. The customer order-history page's "Track Shipment" and "View Details" buttons are both non-functional placeholders that just show a "coming soon" toast; the tracking data exists and is returned by the API, it's simply not rendered anywhere on the customer side.

### Customer order history (`/orders`)

Read-only list of past orders with a status pill, a payment-status pill, and each order's line items. The displayed order total on this page adds only subtotal + shipping (it does not include tax and does not subtract any applied discount), which can understate/overstate the actual total compared to the number shown at checkout for orders that had tax or a coupon. There is no reorder, cancel, or return action anywhere on this page — the only real action is a "Contact Support" link back to the profile page.

## Admin portal overview

Everything under `/admin/**` is gated three times independently: `src/middleware.ts` redirects unauthenticated or non-admin visits away from `/admin/*` pages; `src/app/admin/layout.tsx` re-checks `session.user.role === "ADMIN"` server-side on every admin page as a second belt-and-suspenders check; and **every individual admin API route** under `src/app/api/admin/**` independently calls `auth()` and checks the role again — this last check is what actually protects the admin API surface, since the page middleware doesn't cover API routes at all. There is no way to become an admin except direct database/seed access (`prisma/seed-data/users.ts` seeds one `admin@lavishindia.com` account) — no admin-invite or role-upgrade flow exists anywhere.

Every admin create/update/delete action across every module (products, categories, filters, hero banners, promo banners, budget tiers, discounts, orders, homepage sections, auth images) writes an `AuditLog` row (`adminId`, `adminName`, `action`, `entity`, `entityId`, JSON `metadata`) — this is the app's complete activity trail; there is no dedicated "Audit Log" viewer page found in this audit, so the trail exists in the database but its consumption from the admin UI wasn't confirmed.

The admin surface covers: Products, Categories, Filters, Hero Banners, Promo Banners, Budget Tiers, Homepage Layout (section order/visibility), Auth/Login Carousel Images, Discounts, Customers, and Orders — each documented in its own section below.

## Admin: product catalog management

### Product list (`/admin/products`)

Paginated 20/page, filterable by free-text search (matches name or SKU), category, and sort (newest, name A-Z/Z-A, price/stock low-high/high-low) — all reflected in the URL so state survives a refresh. A "Group by category" toggle switches to loading the whole filtered set at once, grouped into collapsible sections by category, and hides pagination. Columns: thumbnail, name, category, price (with strikethrough compare-at price), stock (with an inline +/− stepper that PATCHes immediately on blur/Enter), published/draft status, edit/delete actions. Bulk selection enables Publish/Unpublish/Delete across the selection, reporting partial failures ("N of total failed") rather than failing silently. Header actions: Export CSV, Bulk Upload (CSV), Add Product.

### Create/edit form

Fields: name, category, slug (auto-derived from name but remains manually editable), SKU, description, price, compare-at price, stock. `discountPercent` exists in the schema/API but has no form field — it's always saved as `null`. Color/Size/Material option chips can be picked from curated values (sourced from the Filters admin module's filters literally slugged `color`/`size`/`material`) or typed freely; a "Generate Variants" button computes every combination of the chosen dimension values, skips combinations that already exist, and auto-names each new variant "Color / Size / Material". Each variant gets its own image sub-gallery (assign existing images or upload new ones without leaving the form); removing a variant does not delete its images — they fall back to the general product gallery. General images support drag-and-drop upload, drag-to-reorder, one primary/cover image, and per-image alt text.

A live "before you publish" checklist (name set, category chosen, price > 0, at least one image) gates the Publish action with a toast listing what's missing. Saving sends the **entire product — base fields plus the full images array and full variants array — as one request**; the server diffs it against the database inside a single transaction (variants/images present in the payload are updated, those missing are deleted, new ones are created), and afterward cleans up storage for any removed image. Publishing also force-sets the product's internal `isActive` flag back to true, since that's the flag an order-history archive (see Delete, below) turns off — without this, a republished product could stay invisible on the storefront even though it shows "Published" in the admin. A standalone per-image/per-variant REST API exists but isn't called by the current form — it's unused, superseded by this single-request diff pattern.

### Delete

Single and bulk delete both apply the same rule: if the product has any order history, it's **archived** instead of hard-deleted (flips active/published off, keeps the row and its order history intact); otherwise it's permanently deleted and its images are cleaned up from storage. The UI shows a different success message for "archived" vs. "deleted" outcomes. Bulk delete reports partial failures rather than claiming full success when some deletes actually failed.

### Publish / Active / Featured / Limited Edition

`isPublished` (storefront visibility) is only changed via the form's Publish/Save Draft buttons or the list's bulk Publish/Unpublish actions — there's no quick single-row toggle on the list itself. `isActive` has no direct admin control at all; it functions purely as an internal "still a live catalog entry vs. archived-due-to-orders" flag, set false only by the archive-on-delete path and reset to true only by Publish. `isFeatured` and `isLimitedEdition` are plain switches in the form that only affect display treatment (featured sections, a "Limited Edition" badge), never storefront visibility.

### CSV bulk import (`/admin/products/bulk-upload`)

Text-only import (no images/variants/discount fields): name, slug, description, price, compare-at price, stock, category (matched by name), SKU, published flag. Rows are validated client-side before submit (invalid rows are excluded and shown with error badges; a mismatched category name or non-numeric price/stock blocks that row). The server creates rows **one at a time, not in a single transaction**, so a partial batch failure leaves the successful rows committed and reports per-row errors for the rest.

## Admin: categories, collections & filters

### Categories (`/admin/categories`)

Card grid ordered by featured order then name; each card shows the category image (falling back to a product's image if none is set), a product-count badge, a Star toggle for "Featured" (which controls Explore-section/navigation visibility), and an "Order N" badge when featured. Create/edit dialogs only expose name, slug, and description — image, featured state, and order are set directly on the card itself: dragging a card reorders it (only the cards whose position actually changed are saved), dropping/clicking an image uploads it immediately and patches the category, and the Star button toggles featured immediately (optimistic, reverts on failure). New categories default to "visible in navigation" on.

**Delete is guarded**: a category that still has products cannot be deleted — the API returns a specific error naming how many products are blocking it, and the admin UI surfaces that exact message. Only an empty category can be deleted, at which point its image is also cleaned up from storage.

### Collections

The `Collection` / `ProductCollection` models exist in the schema (for grouping products into homepage merchandising sets) but **have no admin UI anywhere** — no pages, components, or API routes manage them. They are effectively unmanaged from the admin portal today.

### Filters (`/admin/filters`)

Each `Filter` has a name, slug, type (Checkbox/multi-select, Dropdown, Price Range, or Color), description, an inline Active switch on the list (toggles immediately), and an order. The create/edit form lets an admin add/reorder/remove `FilterOption`s (label + value, plus a color swatch picker when the filter's type is Color) and assign the filter to one or more categories via checkboxes. Saving an edit **fully replaces** the filter's options and category assignments (delete-all-then-recreate), rather than diffing individual entries. Deleting a filter is unconditional — there's no check for whether it's currently assigned to any category.

Filters literally slugged `color`, `size`, and `material` have a special role: they're the single source of the "curated chip" suggestions shown in the product form's variant-option pickers (see Admin: product catalog management). An admin must create filters with exactly those slugs for that curated picker to show anything; otherwise the product form falls back to free-text entry only.

## Admin: homepage content management

### Hero banners

Banner rows are reconciled from a storage folder rather than being purely admin-entered: on every admin list load and every public homepage fetch, a throttled (max once per 15s) sync scans the hero-banner image folder, deletes any banner row whose file no longer exists, and **auto-creates** a new banner row (auto-titled from the filename, linking to `/shop`, active) for any file it finds with no matching row. In practice this means dropping an image straight into storage (outside the UI) is enough to make it appear live on the homepage, and deleting the underlying file removes the banner even without using the delete button. Uploading through the form lands the file in that same watched folder; abandoning the form after uploading (without saving) still results in the banner appearing on the next sync.

Fields: title, subtitle, image, destination link (picked from a dynamically built list of shop pages/categories, or a custom URL, or "no link"), display order, active toggle, and a full scheduling block (date window, and optional recurrence — daily/weekly/monthly, day-of-week or day-of-month, and a time-of-day window). Delete (single or bulk) removes the row and cleans up the stored image. The drag handle shown next to each row's order number is **decorative only** — it has no drag behavior wired up; the only way to reorder is editing the numeric order field and saving. A separate inline control lets an admin batch-edit just the destination link across multiple banners at once.

**Important caveat**: the scheduling fields collected on this form are **not actually enforced on the live homepage** — the homepage's hero-banner query only filters on the Active flag, with no date-window or recurrence check at all. The recurrence logic exists and is correctly implemented elsewhere in the codebase, but the homepage doesn't call it for hero banners.

### Promo banners

Three types (Top Scroll Message, Free Gifts Banner, Special Offer), each with a message, background/text color pickers with a live preview, active toggle, date window, and the same recurrence block as hero banners. Single-row delete only (no bulk delete, unlike hero banners). **Same caveat as hero banners**: the live homepage's promo-banner query enforces the date window but not the recurrence fields — a banner scheduled for "weekends only" would still show every day within its overall campaign window on the actual homepage.

### Budget tiers

Title, a maximum price (rupees in the form, stored as paisa), a raw CSS gradient string with a live preview swatch, an optional icon name (free text, no picker), display order, and an active toggle. Single-row delete only.

### Homepage layout / section ordering

This screen is fully functional and does drive the live homepage: each of the 8 sections (hero, explore, bestsellers, budget, free gifts, new arrivals, trust badges, coupons) has a visibility switch, a title override, and an order value editable via ▲/▼ buttons or direct numeric entry; "Save All Changes" pushes every row's changes, and the homepage reads this table directly to decide what to show, in what order, with what heading. What's **not** wired to any button: the ability to add a new section or delete an existing one — those API endpoints exist and work, but nothing in the admin UI calls them.

### Auth / login carousel images

The simplest of the content modules: a plain upload-and-grid-of-thumbnails-with-delete UI, no titles, ordering, or scheduling — the order shown is whatever the storage listing returns, and there is genuinely no database table behind it (unlike hero banners, which do have a DB row per image). **This admin screen requires ImageKit to be enabled** — it returns a "storage not configured" error in any environment without it, even though the corresponding public-facing carousel and the hero/promo banner admin screens all have a working local-filesystem fallback.

## Admin: discounts / coupons

Fields: code (forced uppercase, must be unique — a clear "already exists" error is shown on collision), title, description, type (Percentage or Fixed Amount), value, optional minimum purchase, optional maximum discount cap (only meaningful — and only applied — for percentage discounts; the field is disabled in the form when type is Fixed Amount), start/end date (both **required**, unlike the banner modules where scheduling is optional), active toggle, optional usage limit (blank/0 = unlimited), and the same recurrence block used by banners (daily/weekly/monthly, day-of-week or day-of-month, time-of-day window).

Unlike the homepage banner reads, **discount eligibility at checkout correctly enforces the recurrence rules**, not just the overall date window — this is the one scheduling-aware surface in the app that's fully wired end to end. `usedCount` is incremented automatically at checkout and shown read-only on the list (`used / limit`); there is no way to edit or reset it from the admin UI.

The list shows a computed status badge (Inactive → Expired → Upcoming → Active, in that priority order, derived from the active flag and dates rather than stored). Delete is single-row only, with a confirm dialog.

## Admin: customers & orders

### Customers (`/admin/customers`)

**Read-only** — there is no edit, delete, ban, or even a detail-view link anywhere on this screen; the only interactive control on the page is a CSV export button. It lists up to the 100 most recent customer accounts with: total orders, successful vs. returned order counts, total spend (orders in Processing/Shipped/Out for Delivery/Delivered), a computed "discount saved" figure, a client-computed loyalty tier badge (Regular / Silver ≥₹5,000 / Gold ≥₹20,000 / VIP ≥₹50,000 lifetime spend — this tier is calculated on the fly for display only, it isn't stored anywhere or used elsewhere in the app), and join date.

### Orders (`/admin/orders`)

Searchable (order number, customer email/name) and filterable by order status and payment status — though the status filter dropdowns omit `REFUNDED` as an option even though it's a valid, settable value. List is capped at the 100 most recent orders. There is no separate order detail page; clicking an order opens a read-only slide-over panel with the customer, shipping address, and line items.

**Status changes** happen directly from a dropdown in the order row — selecting a new status immediately fires the update (no confirmation dialog), writes an `OrderTracking` entry ("Order status updated to X") and an audit log entry. **Payment status is never editable from the admin UI** — it's shown read-only; there is no distinct refund workflow. "Refunding" an order in practice just means picking `REFUNDED` from the same generic status dropdown — no payment-gateway refund call is made and the order's payment status is not touched by that action.

## Caching & revalidation behavior

Storefront reads that are expensive/shared (homepage, category listing, category filters, product SEO metadata) are wrapped in Next.js `unstable_cache` with a **60-second safety-net TTL** and tags: `"homepage"` for everything the homepage touches (hero/promo banners, featured categories, bestsellers, new arrivals, budget tiers, trust badges, coupons, section order); `"products"` plus `"category-<slug>"` for category product listings and category lookups; `"filters"` plus `"category-<slug>"` for category filters; `"products"` plus `"product-<id>"` for product SEO metadata. The live product-detail API, the search/listing `/api/products` route, and reviews are **not cached at all** — they hit Prisma directly on every request, so they're always live.

Every admin mutation route that affects one of these surfaces calls `revalidateTag(...)` with the matching tag(s) immediately after its write, so normally an admin change is reflected on the storefront on the very next request (the 60s TTL is just a fallback, not the primary invalidation path). This is correctly wired for products, product images/variants, categories, filters, hero banners, promo banners, budget tiers, discounts, and homepage sections.

**Known gap**: two smaller public endpoints — the login/auth carousel image list and a (currently unused) featured-categories endpoint — previously used a raw HTTP `Cache-Control` header instead of the tag system, so admin deletes against them had no effect on already-cached responses for up to an hour; both were switched to `no-store` in this session (see Known behaviors, below).

**Scheduling vs. caching are separate systems, and don't always agree.** A banner or discount's recurrence rules (day-of-week/day-of-month/time-of-day) are evaluated fresh on every read that calls them — they are not baked into the cache — but as covered in the Homepage Content section, the homepage's own hero-banner and promo-banner queries don't call that recurrence check at all, so scheduling silently doesn't apply there regardless of caching.

## Known behaviors, edge cases & recently fixed bugs

### Fixed this session

- **Hero banner "resurrection" bug**: single-delete removed the database row but left the image file in storage; the homepage's storage-sync job then recreated the banner from that orphaned file within \~15 seconds, making deleted banners silently reappear. Single delete now cleans up the storage file too, matching bulk delete's existing behavior.
- **Bulk product delete** reported "N products deleted" even when some deletes failed server-side (it only caught network errors, not HTTP error responses). Now checks each response and reports real failures.
- **Category delete** could cascade-delete every product in the category, or crash with a generic error if any of them had order history. Delete is now blocked with a clear message when the category still has products.
- Category delete/replace never cleaned up the old image file in storage; both paths now do.
- Two endpoints (login-carousel image list, an unused featured-categories endpoint) used a browser/CDN cache header immune to the app's tag-based invalidation; both switched to `no-store`.

### Not implemented (by design or left incomplete)

- **Email/mobile verification, password reset, and account deletion** are all unimplemented — no code path exists for any of them (the "forgot password" link just shows a "coming soon" toast).
- **OTP login is built end-to-end but not usable by real customers** — the one-time code is only ever written to the server console, never actually sent by SMS or email; no delivery provider is wired up. OTP codes are also stored in an in-memory map, so they don't survive a server restart or work across multiple server instances.
- **No stock/inventory decrement occurs anywhere in checkout** — stock only ever changes from the admin product screens; an item that sells out between add-to-cart and order placement is accepted with no server-side check.
- **No order-confirmation email/SMS is sent**, despite the order-success page's on-screen copy claiming one was.
- **No Razorpay webhook exists** — payment confirmation depends entirely on the customer's browser completing the post-payment verification call; a dropped connection right after a successful charge can leave an order stuck `PENDING`/unpaid with no automatic reconciliation.
- **Customers cannot cancel, reorder, or track their own orders** — the order-history page's tracking/detail buttons are non-functional placeholders, even though the underlying tracking data is correctly recorded and available via the API.
- **The admin Orders screen has no real refund workflow** — "refunding" is just picking `REFUNDED` from the same status dropdown used for shipping updates; payment status is never touched by it and no gateway refund call is made.
- **The admin Customers screen is view-only** — no edit, delete, or ban action exists.
- **The `Cart`/`CartItem` database models are unused** — the real cart is entirely `localStorage`-based, per-browser, with no server-side merge on login and no cross-device sync.
- **The `Collection` model has no admin UI** — it exists in the schema but nothing manages it today.
- Recurrence scheduling (day/time rules) on hero banners and promo banners is **not enforced on the live homepage** — only the overall active flag / date window is checked there; the recurrence logic itself is correctly implemented and does work in the (separately-existing) API routes and in discount eligibility at checkout, which is the one place recurrence is fully honored end to end.
- Two admin API endpoint pairs exist fully implemented but have **no UI button calling them**: adding/removing a homepage section, and the older per-image/per-variant product sub-APIs (superseded by the product form's single-request diff-on-save).
- The hero banner admin table's drag handle is **decorative** — reordering only works through the numeric order field.
- The header's account menu links to `/addresses` and `/wishlist` as standalone pages, but no route exists for either — only `/profile` and `/orders` actually resolve; those two links currently fall through to the app's generic category page instead of reaching the intended tab.
- The customer order-history page's displayed order total omits tax and any applied discount, which can differ from the total shown at checkout for orders that had either.
- A product with no variants can show as "Out of Stock" on its detail page regardless of its actual stock level, because that API response only carries stock at the variant level.
