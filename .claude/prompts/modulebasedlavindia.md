You are working on the existing LavIndia ecommerce application.

Always in mind :

1. is this best UI --> simple to use, looks elgant, follows theme, proper space managmetn, mobile first web application. Customers are trillionaries, billionaries, and admin is also a trillionare, so make sure things shoudl be simple.

IMPORTANT:
Do NOT rebuild the application from scratch.
Do NOT replace existing functionality unnecessarily.
Study the existing codebase first and extend/refactor it safely.

The goal is to evolve the current LavIndia application into a modular business platform where Catalog, Ecommerce, Inventory, POS, Billing, Marketing, etc. are isolated business domains.

The application may remain ONE Next.js application and ONE PostgreSQL database for now.

However, the BUSINESS LOGIC MUST BE ISOLATED so that Inventory, POS, Billing, Catalog, etc. can later become standalone products/services or have their own UI without rewriting their core logic.

==================================================

1. # FIRST: AUDIT THE EXISTING SYSTEM

Before modifying anything:

1. Inspect the complete existing project structure.
2. Read the existing Prisma schema.
3. Inspect:
   - Products
   - Product variants
   - Product images
   - Categories
   - Collections
   - Orders
   - OrderItems
   - Payments
   - Customers
   - Cart
   - Admin
   - Authentication/authorization
   - Existing product APIs
   - Existing checkout
   - Existing admin screens
   - Existing marketing screens
   - Existing audit logging
4. Identify existing functionality that must be preserved.
5. Identify duplicate/conflicting responsibilities.
6. Do not create duplicate systems when an existing system can be evolved.

Create a short implementation plan internally before coding.

# ================================================== 2. TARGET BUSINESS ARCHITECTURE

Create these isolated domains/modules:

src/modules/

catalog/
ecommerce/
inventory/
pos/
billing/
marketing/
customers/
orders/
payments/

Each module must own its own business logic.

Example:

catalog/
products/
variants/
categories/

inventory/
stock/
movements/
locations/
barcodes/

pos/
cart/
checkout/
sales/

billing/
invoices/
templates/
rendering/

ecommerce/
storefront/
cart/
checkout/

orders/
order/
order-items/

payments/
payment/

Do NOT allow modules to directly depend on another module's internal implementation.

For example:

BAD:
inventory imports Prisma models/functions directly from catalog internals.

GOOD:
inventory uses a clean Catalog interface/repository/service to resolve VariantId/SKU/barcode.

Use clear contracts/interfaces between domains.

# ================================================== 3. IMPORTANT PRINCIPLE

Separate PRODUCT from UI.

For now:

ONE application
ONE database
ONE authentication system
ONE LavIndia Admin shell

But:

ISOLATED business domains
ISOLATED services
ISOLATED repositories
ISOLATED APIs
ISOLATED data ownership

Later we should be able to build:

inventory.lavindia.com
pos.lavindia.com
billing.lavindia.com

without rewriting the underlying business logic.

Do NOT create separate admin panels now.

# ================================================== 4. CATALOG DOMAIN

Catalog owns:

- Product
- ProductVariant
- ProductImage
- Category
- Collection
- Product metadata
- Product descriptions
- Product pricing
- Variant definitions

Product creation MUST remain under:

Admin → Catalog → Products → Add Product

Inventory must NEVER create products.

Inventory must NEVER upload product images.

Inventory must NEVER duplicate product data.

Example:

Product:
Gold Necklace

Variants:

- Small
- Medium
- Large

Inventory:

- Small = 0
- Medium = 0
- Large = 1

Later:

Small = 2
Medium = 3
Large = 1

Do NOT create separate products for each stock quantity.

# ================================================== 5. VARIANT / SKU ARCHITECTURE

A sellable variant is the actual inventory-tracked item.

Every sellable variant should support:

- Variant ID
- Product ID
- Variant name
- SKU
- Barcode
- Price
- Status
- Attributes such as size/color/material
- Inventory quantity through Inventory domain

If a product has no meaningful variants, create/use a:

DEFAULT variant

Example:

Product:
Gold Ring

Variant:
Default

SKU:
LAV-RING-001

Barcode:
internal Code 128 barcode

Do NOT maintain Product.stock and Variant.stock as competing sources of truth.

Migrate existing Product.stock into the appropriate Default Variant / inventory structure.

Eventually remove dependency on Product.stock.

# ================================================== 6. INVENTORY DOMAIN

Inventory owns ONLY physical stock.

Create:

InventoryLocation

Fields should include approximately:

- id
- name
- code
- isActive
- createdAt
- updatedAt

Create one initial location:

Main Stock

This represents the current physical stock location/home.

Do NOT hardcode the architecture to one location.

Create:

InventoryLevel

- id
- variantId
- locationId
- quantity
- reservedQuantity
- createdAt
- updatedAt

Available stock:

quantity - reservedQuantity

Create:

InventoryMovement

- id
- variantId
- locationId
- type
- quantity
- beforeQuantity
- afterQuantity
- referenceType
- referenceId
- reason
- createdBy
- createdAt

Movement types:

RECEIVE
SALE
RETURN
ADJUSTMENT_IN
ADJUSTMENT_OUT
DAMAGE
RESERVE
RELEASE

Inventory must have ONE source of truth.

Website sales and POS sales MUST consume the same inventory.

Never maintain:

website stock

- POS stock

as separate quantities.

# ================================================== 7. INVENTORY ADMIN UI

Do NOT create another admin application.

Extend the existing LavIndia Admin.

Navigation:

ADMIN

Catalog
Products
Categories
Filters
Collections

Sales
Online Orders
Store POS

Inventory
Stock
Receive Stock
Adjustments
Movements
Barcodes

Billing
Invoices

Customers

Marketing
Hero Banners
Promo Banners
Discounts
Homepage

Analytics

Inventory UI must be isolated from Catalog business logic even though it appears inside the same Admin shell.

# ================================================== 8. INVENTORY STOCK SCREEN

Create:

Admin → Inventory → Stock

Show:

- Product
- Variant
- SKU
- Barcode
- Location
- Quantity
- Reserved
- Available
- Status

Support:

- Search product
- Search SKU
- Search barcode
- Filter by stock status
- Filter by location

Inventory screen MUST NOT have:

"Create Product"

Instead it should operate on existing Catalog variants.

# ================================================== 9. RECEIVE STOCK

Create:

Inventory → Receive Stock

Flow:

Search/scan SKU or barcode
→ identify variant
→ show product + variant
→ show current stock
→ enter quantity
→ confirm

On confirmation:

Create InventoryMovement(RECEIVE)

Update InventoryLevel atomically.

Example:

Current = 1
Receive = 3
New = 4

Do not directly mutate random Product/Variant stock fields.

# ================================================== 10. STOCK ADJUSTMENTS

Create:

Inventory → Adjustments

Support:

Adjustment In
Adjustment Out
Damage

Require:

- Variant
- Location
- Quantity
- Reason

Every adjustment must create an InventoryMovement.

Never silently change stock.

# ================================================== 11. INVENTORY MOVEMENT HISTORY

Create:

Inventory → Movements

Show:

- Date
- Product
- Variant
- SKU
- Barcode
- Location
- Movement type
- Quantity
- Before
- After
- Reference
- Reason
- User

Inventory history must be immutable.

# ================================================== 12. BARCODE SYSTEM

Barcode belongs to the SELLABLE VARIANT.

SKU and Barcode are different identifiers.

Use internal Code 128 barcodes.

Do NOT claim that internally generated barcodes are registered EAN/GTIN numbers.

Create:

Inventory → Barcodes

Support:

A. Single label

Search/select variant
→ quantity
→ print

B. Product labels

Select product
→ select variants
→ quantities
→ print

C. Bulk labels

Select multiple products/variants
→ quantities
→ print all

Label should contain:

LAVINDIA
Product Name
Variant
Price
Barcode
Human-readable SKU/barcode

Do not duplicate product images/data into Inventory.

# ================================================== 13. BARCODE SCANNING

Create a reusable BarcodeScanner abstraction.

Sources:

CAMERA
HARDWARE_SCANNER
MANUAL_ENTRY

Initially implement:

PHONE CAMERA

- MANUAL ENTRY

Design it so Bluetooth/USB scanners can later work without changing POS logic.

Hardware scanners should simply provide barcode input to the same lookup pipeline.

Unknown barcode:

DO NOT automatically create a product.

Instead show:

"Barcode not found"

and allow manual search.

# ================================================== 14. POS DOMAIN

POS must be a separate business domain.

UI can initially live inside the same application.

POS should be mobile/tablet-first.

Create:

Sales → Store POS

Flow:

Open POS

→ Scan/search product

→ Add multiple items

→ Optional customer

→ Walk-in customer if no customer selected

→ Adjust item quantity

→ Optional item-level discount/price override

→ Payment

→ Complete Sale

→ Order created

→ Inventory SALE movement

→ Invoice generated

# ================================================== 15. POS PRODUCT LOOKUP

POS must NOT own products.

POS searches Catalog using:

- Barcode
- SKU
- Product name

Then retrieves inventory availability from Inventory.

The POS should display:

- Product
- Variant
- SKU
- Price
- Available stock

# ================================================== 16. POS PRICE OVERRIDE

Allow authorized POS users to override selling price.

IMPORTANT:

Price override must NOT modify Catalog price.

OrderItem must snapshot:

- catalogPrice
- sellingPrice
- discount
- quantity

Optionally:

- priceOverride
- overrideReason
- overriddenBy

The catalog price remains unchanged.

# ================================================== 17. POS CUSTOMER

Support:

Existing customer
New customer
Walk-in customer

Optional fields:

- Name
- Mobile
- GSTIN

Do not make customer creation mandatory for every sale.

# ================================================== 18. POS PAYMENTS

Initially support:

Cash
UPI
Card
Other

Do not build WhatsApp/SMS/email integrations now.

# ================================================== 19. ORDERS

Do NOT create:

OnlineOrder
OfflineOrder

as separate systems.

Use ONE Order system.

Add:

source

Values:

ONLINE
STORE

Both flows must create the same Order structure.

Example:

ONLINE:

Storefront
→ Checkout
→ Order(source=ONLINE)
→ Payment
→ Inventory
→ Invoice

STORE:

POS
→ Complete Sale
→ Order(source=STORE)
→ Payment
→ Inventory
→ Invoice

# ================================================== 20. ORDER ITEM SNAPSHOT

OrderItems must preserve historical information.

Store/snapshot at minimum:

- Product name
- Variant name
- SKU
- Product image if required
- Catalog price
- Selling price
- Discount
- Quantity
- Tax information where applicable

Invoices MUST NOT depend on current Product data.

If product price changes later, old invoices must remain unchanged.

# ================================================== 21. INVENTORY + ONLINE CHECKOUT

Existing checkout currently does not safely decrement stock.

Fix this.

Online checkout must:

1. Validate inventory server-side.
2. Prevent overselling.
3. Use database transactions/concurrency protection.
4. Reserve inventory where payment flow requires it.
5. Release reservation on payment failure/cancellation.
6. Commit SALE when the sale is successfully completed.

Do not trust client-side stock values.

Never rely on localStorage as the inventory source of truth.

# ================================================== 22. PAYMENT ARCHITECTURE

Preserve the existing Razorpay integration where possible.

Improve it so payment confirmation is server-authoritative.

Do not treat browser-only verification as the final source of truth.

Structure payment logic as an isolated Payments domain.

# ================================================== 23. BILLING DOMAIN

Billing is a separate domain.

Billing owns:

- Invoice
- Invoice numbering
- Invoice generation
- Invoice rendering
- Printing/PDF

Billing does NOT own:

- Products
- Inventory
- Catalog pricing
- POS cart

Billing consumes completed Order data.

# ================================================== 24. INVOICE NUMBERING

Order number and Invoice number MUST be different.

Example:

Order:
LVI-20260919-A82F

Invoice:
INV/26-27/000123

Implement unique sequential invoice numbering suitable for financial-year numbering.

Do not generate invoice numbers from random order IDs.

# ================================================== 25. INVOICE TEMPLATE

An existing Canva invoice design/reference exists.

Do NOT make Canva itself a runtime dependency.

Recreate the visual design using reusable:

React

- HTML
- CSS

components.

Suggested structure:

src/modules/billing/invoices/

InvoiceTemplate.tsx
InvoiceRenderer.tsx
invoice-types.ts
invoice-number.ts
invoice-pdf.ts

The invoice template must accept dynamic data.

It must work for:

ONLINE orders
STORE/POS orders

Same invoice engine.

Same invoice template.

Different Order.source.

# ================================================== 26. INVOICE DATA

Invoice should support:

Business information
Invoice number
Invoice date
Customer name
Customer mobile
Customer address
Customer GSTIN where applicable

Items:

Product
Variant
SKU
HSN where applicable
Quantity
Unit price
Discount
Tax
Line total

Totals:

Subtotal
Discount
Tax
Grand total
Payment method
Payment reference where applicable

Keep tax/GST calculations separate from visual rendering.

Do not hardcode GST business logic into the invoice UI.

# ================================================== 27. INVOICE OUTPUT

Support:

Browser print
PDF generation/download

The same invoice renderer should be reusable.

# ================================================== 28. MARKETING DOMAIN

Keep existing Marketing functionality.

Do not mix Marketing logic into Catalog, Inventory or POS.

Existing:

- Hero Banners
- Promo Banners
- Discounts
- Homepage layout
- Budget tiers
- Auth carousel

should remain functional.

Refactor only where required to establish clean boundaries.

# ================================================== 29. EXISTING ADMIN

Keep the existing LavIndia Admin.

Do NOT create:

Inventory Admin
POS Admin
Billing Admin

as separate admin panels.

Instead:

LavIndia Admin
├── Catalog
├── Sales
├── Inventory
├── Billing
├── Customers
├── Marketing
└── Analytics

The business domains must be isolated underneath the UI.

# ================================================== 30. AUTHORIZATION

Preserve existing authentication.

Prepare architecture for future roles such as:

ADMIN
INVENTORY_MANAGER
SALES_OPERATOR
BILLING_OPERATOR

Do not overcomplicate permissions unless the existing architecture requires it.

At minimum, protect inventory/POS/billing mutations appropriately.

# ================================================== 31. AUDIT LOGGING

Use the existing audit logging system.

Important inventory mutations must be auditable:

Receive stock
Adjust stock
Damage
POS sale
Online sale
Return
Price override
Invoice creation/voiding where applicable

Do not silently mutate inventory.

# ================================================== 32. TRANSACTION SAFETY

Inventory operations must be atomic.

Especially:

Receive
Adjustment
POS sale
Online sale
Reservation
Release
Return

Protect against:

Two users selling the last item simultaneously.

Example:

Stock = 1

POS attempts sale
AND
Website attempts sale

Only one should successfully consume the available unit.

Use proper database transactions/concurrency protection.

# ================================================== 33. DATA MIGRATION

Before changing the schema:

Understand the existing production/data model.

Create safe migrations.

Do NOT delete existing data.

Migrate existing products that currently rely on Product.stock into the new variant/inventory model.

Preserve existing:

- Products
- Variants
- Images
- Orders
- Customers
- Payments
- Marketing data

Existing historical orders must continue to work.

# ================================================== 34. DO NOT BUILD NOW

Do NOT implement:

- Accounting/ledger
- Full GST filing system
- Supplier management
- Purchase orders
- Full warehouse management UI
- WhatsApp integration
- SMS integration
- Email notification platform
- Loyalty system
- Subscription billing
- Marketplace integrations
- Complex returns portal

Design interfaces so they can be added later.

# ================================================== 35. API / SERVICE BOUNDARIES

Do not put all business logic inside:

Next.js pages
React components
route handlers

Create domain services.

Examples:

CatalogService
InventoryService
BarcodeService
POSService
OrderService
PaymentService
BillingService

Routes should call domain services.

UI should call APIs/actions.

Business rules should NOT live primarily in UI components.

# ================================================== 36. SHARED CONTRACTS

Use stable identifiers/contracts:

ProductId
VariantId
SKU
Barcode
OrderId
InvoiceId
CustomerId
LocationId

Avoid passing arbitrary database objects between domains.

Prefer explicit DTOs/interfaces.

Example:

Inventory should receive:

VariantId
LocationId
Quantity
Reference

rather than depending on the entire Product database object.

# ================================================== 37. ERROR HANDLING

Implement clear failures.

Examples:

Insufficient stock
Unknown barcode
Invalid SKU
Duplicate barcode
Invalid quantity
Payment failed
Inventory reservation failed
Invoice generation failed

Never leave partial state.

If:

Payment succeeds
but inventory operation fails

the system must have a defined transactional/recovery strategy.

Do not silently swallow errors.

# ================================================== 38. UI PRINCIPLES

Preserve the existing LavIndia design system.

Do not unnecessarily redesign existing screens.

Inventory:

Desktop-first admin UI.

POS:

Mobile/tablet-first.

Storefront:

Existing customer-facing experience.

Billing:

Clean print-friendly layout.

Use existing:

Next.js
React
TypeScript
Panda CSS
Radix
React Hook Form
Zod
Prisma

where already established.

Do not introduce another UI framework without a strong reason.

# ================================================== 39. IMPLEMENTATION ORDER

Implement in this order:

PHASE 1
Catalog foundation

- Default Variant
- Variant SKU
- Variant Barcode
- Remove dependency on Product.stock
- Preserve existing product/variant images

PHASE 2
Inventory

- InventoryLocation
- InventoryLevel
- InventoryMovement
- Stock page
- Receive Stock
- Adjustments
- Movement history

PHASE 3
Barcode

- Barcode generation
- Single printing
- Product printing
- Bulk printing
- Label layout
- Camera scanning abstraction

PHASE 4
POS

- Mobile POS
- Barcode scanner
- Product search
- Cart
- Customer/walk-in
- Price override
- Payment
- Store Order
- Inventory integration

PHASE 5
Ecommerce integration

- Server-side stock validation
- Inventory reservation
- Release
- Sale movement
- Race-condition protection

PHASE 6
Billing

- Invoice model
- Invoice numbering
- Invoice snapshot
- React invoice template
- Browser print
- PDF
- Online + POS invoice

PHASE 7
Hardening

- Permissions
- Audit logs
- Error recovery
- Transactions
- Inventory consistency checks
- Tests
- Migration verification

# ================================================== 40. TESTING REQUIREMENTS

Before finishing, test these scenarios.

SCENARIO 1

Product:
Gold Necklace

Variants:
Small
Medium
Large

Inventory:
Small 0
Medium 0
Large 1

Verify:

POS can sell Large.
POS cannot sell Small.
Website cannot sell Small.
Website can sell Large.
After Large is sold:

Large = 0

==================================================

SCENARIO 2

Receive:

Large +3

Verify:

Large = 3

and RECEIVE movement exists.

==================================================

SCENARIO 3

POS sale:

Large quantity 1

Verify:

Order source = STORE
Inventory SALE movement exists
Stock decreases
Invoice exists

==================================================

SCENARIO 4

Online sale:

Large quantity 1

Verify:

Order source = ONLINE
Inventory SALE movement exists
Stock decreases
Invoice exists

==================================================

SCENARIO 5

Concurrent sale:

Stock = 1

Attempt two simultaneous sales.

Exactly one must succeed.

==================================================

SCENARIO 6

Price override:

Catalog price = ₹10,000

POS selling price = ₹9,000

Verify:

Catalog price remains ₹10,000.

Order stores:

catalogPrice = ₹10,000
sellingPrice = ₹9,000

==================================================

SCENARIO 7

Historical invoice:

Create invoice at ₹10,000.

Later change product price to ₹12,000.

Old invoice must still show ₹10,000.

==================================================

SCENARIO 8

Unknown barcode:

Scan unknown barcode.

System must NOT create a product automatically.

# ================================================== 41. CODE QUALITY

Follow existing project conventions where sensible.

Avoid:

- Duplicate models
- Duplicate services
- Duplicate APIs
- Duplicate stock systems
- Duplicate order systems
- Business logic in UI
- Hardcoded single-location assumptions
- Direct cross-module database coupling
- Breaking existing functionality unnecessarily

Prefer:

- Small domain services
- Explicit interfaces
- Transactions
- Type-safe DTOs
- Reusable components
- Clear ownership
- Testable business logic

# ================================================== 42. FINAL ARCHITECTURAL RESULT

The final system should conceptually look like:

                    LAVINDIA PLATFORM

                         │
        ┌────────────────┼────────────────┐
        │                │                │
     STOREFRONT        ADMIN             POS
        │                │                │
     Ecommerce       Management       Store Sales
                         │
        ┌────────────────┼────────────────────┐
        │                │                    │
     Catalog         Inventory             Billing
        │                │                    │
        └────────────────┼────────────────────┘
                         │
                      Orders
                         │
                      Payments

But internally:

Catalog ≠ Inventory
Inventory ≠ POS
POS ≠ Billing
Billing ≠ Catalog
Ecommerce ≠ Inventory

They communicate through explicit contracts/services.

# ================================================== 43. MOST IMPORTANT RULE

Do NOT interpret "isolated modules" as:

"Create five separate admin websites."

That is NOT the requirement.

The requirement is:

ONE LavIndia application today.

ONE Admin shell today.

ISOLATED BUSINESS DOMAINS underneath.

Each domain should be capable of becoming a separate product/UI later.

Build the architecture for that future now without unnecessary infrastructure complexity.

# ================================================== 44. DELIVERY REQUIREMENT

After implementation:

1. Verify existing LavIndia functionality still works.
2. Verify database migrations.
3. Verify all new APIs/services.
4. Verify Inventory consistency.
5. Verify POS flow.
6. Verify Online checkout flow.
7. Verify Invoice generation.
8. Verify barcode flow.
9. Verify authorization.
10. Run tests/build/lint/typecheck.

At the end, provide a concise implementation report:

- What was changed
- Database changes
- New modules
- New APIs/services
- Existing functionality preserved
- Migration performed
- Tests performed
- Known limitations
- Any decisions requiring my approval

Do not stop after creating the architecture.
Actually implement the complete system on top of the existing LavIndia codebase.
