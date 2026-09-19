-- ---------------------------------------------------------------------------
-- Inventory ("Jabitha") + Billing + POS foundation.
--
-- Every statement below is additive or widening. No column is dropped and no
-- row is deleted: existing products, variants, images, orders, customers,
-- payments and marketing data are untouched.
-- ---------------------------------------------------------------------------

-- Catch-up for two columns that were previously applied straight to the
-- database with `prisma db push` and so never made it into migration history.
ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "blinkitLink" TEXT;
ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "zeptoLink" TEXT;

-- CreateEnum
CREATE TYPE "OrderSource" AS ENUM ('ONLINE', 'STORE');

-- CreateEnum
CREATE TYPE "InventoryMovementType" AS ENUM ('RECEIVE', 'SALE', 'RETURN', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'DAMAGE', 'RESERVE', 'RELEASE');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('ISSUED', 'VOID');

-- DropForeignKey
ALTER TABLE "public"."orders" DROP CONSTRAINT "orders_addressId_fkey";

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "barcode" TEXT,
ADD COLUMN     "catalogPriceCents" INTEGER,
ADD COLUMN     "discountCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "hsnCode" TEXT,
ADD COLUMN     "overriddenBy" TEXT,
ADD COLUMN     "overrideReason" TEXT,
ADD COLUMN     "sku" TEXT,
ADD COLUMN     "taxCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "taxRateBps" INTEGER,
ADD COLUMN     "variantName" TEXT;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "customerGstin" TEXT,
ADD COLUMN     "customerMobile" TEXT,
ADD COLUMN     "customerName" TEXT,
ADD COLUMN     "source" "OrderSource" NOT NULL DEFAULT 'ONLINE',
ALTER COLUMN "userId" DROP NOT NULL,
ALTER COLUMN "addressId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "reference" TEXT;

-- AlterTable
ALTER TABLE "product_variants" ADD COLUMN     "barcode" TEXT,
ADD COLUMN     "isDefault" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "position" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "inventory_locations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_levels" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "reservedQuantity" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_levels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_movements" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "type" "InventoryMovementType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "beforeQuantity" INTEGER NOT NULL,
    "afterQuantity" INTEGER NOT NULL,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "reason" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "financialYear" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'ISSUED',
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "voidedAt" TIMESTAMP(3),
    "voidReason" TEXT,
    "subtotalCents" INTEGER NOT NULL,
    "discountCents" INTEGER NOT NULL DEFAULT 0,
    "taxCents" INTEGER NOT NULL DEFAULT 0,
    "totalCents" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_sequences" (
    "financialYear" TEXT NOT NULL,
    "lastNumber" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoice_sequences_pkey" PRIMARY KEY ("financialYear")
);

-- CreateIndex
CREATE UNIQUE INDEX "inventory_locations_code_key" ON "inventory_locations"("code");

-- CreateIndex
CREATE INDEX "inventory_levels_locationId_idx" ON "inventory_levels"("locationId");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_levels_variantId_locationId_key" ON "inventory_levels"("variantId", "locationId");

-- CreateIndex
CREATE INDEX "inventory_movements_variantId_createdAt_idx" ON "inventory_movements"("variantId", "createdAt");

-- CreateIndex
CREATE INDEX "inventory_movements_locationId_createdAt_idx" ON "inventory_movements"("locationId", "createdAt");

-- CreateIndex
CREATE INDEX "inventory_movements_referenceType_referenceId_idx" ON "inventory_movements"("referenceType", "referenceId");

-- CreateIndex
CREATE INDEX "inventory_movements_createdAt_idx" ON "inventory_movements"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoiceNumber_key" ON "invoices"("invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_orderId_key" ON "invoices"("orderId");

-- CreateIndex
CREATE INDEX "invoices_issuedAt_idx" ON "invoices"("issuedAt");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_financialYear_sequence_key" ON "invoices"("financialYear", "sequence");

-- CreateIndex
CREATE INDEX "order_items_orderId_idx" ON "order_items"("orderId");

-- CreateIndex
CREATE INDEX "orders_source_createdAt_idx" ON "orders"("source", "createdAt");

-- CreateIndex
CREATE INDEX "orders_createdAt_idx" ON "orders"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_barcode_key" ON "product_variants"("barcode");

-- CreateIndex
CREATE INDEX "product_variants_productId_idx" ON "product_variants"("productId");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_levels" ADD CONSTRAINT "inventory_levels_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_levels" ADD CONSTRAINT "inventory_levels_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "inventory_locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "inventory_locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ---------------------------------------------------------------------------
-- DATA MIGRATION
--
-- Moves the legacy per-product and per-variant stock counters into the
-- Inventory domain's single source of truth. Nothing is deleted: the old
-- `products.stock` and `product_variants.stock` columns are left in place,
-- untouched, so this migration stays auditable and reversible by inspection.
-- ---------------------------------------------------------------------------

-- 1. The initial physical stock location. Multi-location is supported from
--    day one; this is simply the one that exists today.
INSERT INTO "inventory_locations" ("id", "name", "code", "isActive", "isDefault", "createdAt", "updatedAt")
VALUES (gen_random_uuid()::text, 'Main Stock', 'MAIN', true, true, NOW(), NOW())
ON CONFLICT ("code") DO NOTHING;

-- 2. Identifier sequence backing generated SKUs and internal barcodes.
CREATE SEQUENCE IF NOT EXISTS "lav_variant_identifier_seq" START 1;

-- 3. Every product must have at least one sellable variant, because the
--    Inventory, POS and Billing domains only ever deal in variants. Products
--    with no variants get a single Default variant that inherits the
--    product's legacy stock count.
INSERT INTO "product_variants" ("id", "name", "priceCents", "sku", "color", "size", "material", "stock", "isDefault", "position", "isActive", "productId")
SELECT
  gen_random_uuid()::text,
  'Default',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  p."stock",
  true,
  0,
  true,
  p."id"
FROM "products" p
WHERE NOT EXISTS (SELECT 1 FROM "product_variants" v WHERE v."productId" = p."id");

-- 4. Give every sellable variant a SKU. Existing SKUs are never overwritten.
--    Shape: LAV-<product slug fragment>-<sequence>, e.g. LAV-GOLDRING-00042.
UPDATE "product_variants" v
SET "sku" = 'LAV-'
  || UPPER(COALESCE(NULLIF(LEFT(REGEXP_REPLACE(p."slug", '[^a-zA-Z0-9]', '', 'g'), 8), ''), 'ITEM'))
  || '-'
  || LPAD(NEXTVAL('lav_variant_identifier_seq')::text, 5, '0')
FROM "products" p
WHERE v."productId" = p."id" AND v."sku" IS NULL;

-- 5. Give every sellable variant an internal Code 128 barcode. These are
--    LavIndia-internal identifiers only — they are NOT registered EAN/GTIN
--    numbers and must never be presented as such.
UPDATE "product_variants"
SET "barcode" = 'LAV' || LPAD(NEXTVAL('lav_variant_identifier_seq')::text, 10, '0')
WHERE "barcode" IS NULL;

-- 6. Seed the single source of truth for physical stock from the legacy
--    counters, at the Main Stock location.
INSERT INTO "inventory_levels" ("id", "variantId", "locationId", "quantity", "reservedQuantity", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  v."id",
  l."id",
  GREATEST(COALESCE(v."stock", 0), 0),
  0,
  NOW(),
  NOW()
FROM "product_variants" v
CROSS JOIN (SELECT "id" FROM "inventory_locations" WHERE "code" = 'MAIN') l
ON CONFLICT ("variantId", "locationId") DO NOTHING;

-- 7. Record the seeding in the movement ledger so the opening balance of
--    every variant has a traceable origin rather than appearing from nowhere.
INSERT INTO "inventory_movements" ("id", "variantId", "locationId", "type", "quantity", "beforeQuantity", "afterQuantity", "referenceType", "referenceId", "reason", "createdBy", "createdAt")
SELECT
  gen_random_uuid()::text,
  lvl."variantId",
  lvl."locationId",
  'RECEIVE'::"InventoryMovementType",
  lvl."quantity",
  0,
  lvl."quantity",
  'MIGRATION',
  '20260919120000_add_inventory_billing_pos_foundation',
  'Opening balance migrated from legacy stock counters',
  'system',
  NOW()
FROM "inventory_levels" lvl
WHERE lvl."quantity" > 0;

-- 8. Backfill the order-item snapshot columns for historical orders so old
--    invoices render from frozen data instead of the live catalog.
UPDATE "order_items" oi
SET "catalogPriceCents" = oi."priceCents"
WHERE oi."catalogPriceCents" IS NULL;

UPDATE "order_items" oi
SET "sku" = v."sku",
    "barcode" = v."barcode",
    "variantName" = v."name"
FROM "product_variants" v
WHERE oi."variantId" = v."id" AND oi."sku" IS NULL;

-- 9. Historical orders all predate the POS and are therefore online orders.
--    (`source` already defaults to ONLINE; this is stated explicitly so the
--    intent is recorded rather than inferred from a default.)
UPDATE "orders" SET "source" = 'ONLINE' WHERE "source" IS NULL;
