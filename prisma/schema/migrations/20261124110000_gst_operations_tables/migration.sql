-- CreateEnum
CREATE TYPE "GstChargeTreatment" AS ENUM ('UNSET', 'NONE', 'FOLLOWS_GOODS', 'SEPARATE');

-- CreateEnum
CREATE TYPE "GstMixedBasketPolicy" AS ENUM ('PROPORTIONAL', 'HIGHEST_RATE');

-- CreateEnum
CREATE TYPE "GstPlatingType" AS ENUM ('UNKNOWN', 'NONE', 'ELECTROPLATED', 'PVD', 'CLAD_BONDED', 'SOLID_PRECIOUS');

-- CreateEnum
CREATE TYPE "GstInfoStatus" AS ENUM ('MISSING', 'PARTIAL', 'COMPLETE');

-- CreateEnum
CREATE TYPE "GstClassificationAction" AS ENUM ('INFO_SAVED', 'SUGGESTED', 'SUBMITTED', 'APPROVED', 'REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "GstInvoiceKind" AS ENUM ('B2B', 'B2C');

-- CreateEnum
CREATE TYPE "GstEInvoiceStatus" AS ENUM ('NOT_APPLICABLE', 'NOT_GENERATED', 'GENERATED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "GstCreditKind" AS ENUM ('FULL', 'PARTIAL');

-- CreateEnum
CREATE TYPE "GstProposalStatus" AS ENUM ('PROPOSED', 'IN_REVIEW', 'ACCEPTED', 'REJECTED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "GstReturnType" AS ENUM ('GSTR1', 'GSTR3B');

-- CreateEnum
CREATE TYPE "GstReconStatus" AS ENUM ('DRAFT', 'MATCHED', 'DIFFERENCES');

-- CreateEnum
CREATE TYPE "GstPendingKind" AS ENUM ('PRODUCT', 'CATEGORY');

-- CreateEnum
CREATE TYPE "GstPendingStatus" AS ENUM ('PENDING_IMPORT', 'IMPORTED', 'DROPPED');

-- CreateTable
CREATE TABLE "gst_configuration" (
    "id" TEXT NOT NULL,
    "shippingTreatment" "GstChargeTreatment" NOT NULL DEFAULT 'UNSET',
    "codTreatment" "GstChargeTreatment" NOT NULL DEFAULT 'UNSET',
    "mixedBasketPolicy" "GstMixedBasketPolicy",
    "treatmentBasis" TEXT,
    "treatmentApprovedBy" TEXT,
    "treatmentApprovedAt" TIMESTAMP(3),
    "stateTableReviewedBy" TEXT,
    "stateTableReviewedAt" TIMESTAMP(3),
    "placeOfSupplyReviewedBy" TEXT,
    "placeOfSupplyReviewedAt" TIMESTAMP(3),
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gst_configuration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gst_product_profiles" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "baseMetal" TEXT,
    "alloyNotes" TEXT,
    "platingType" "GstPlatingType" NOT NULL DEFAULT 'UNKNOWN',
    "platingMetal" TEXT,
    "preciousMetal" TEXT,
    "preciousPurity" TEXT,
    "preciousWeightMg" INTEGER,
    "gems" JSONB,
    "isHandmade" BOOLEAN,
    "handmadeNotes" TEXT,
    "supplierName" TEXT,
    "supplierHsn" TEXT,
    "materialNotes" TEXT,
    "infoStatus" "GstInfoStatus" NOT NULL DEFAULT 'MISSING',
    "confirmedBy" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gst_product_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gst_supplier_documents" (
    "id" TEXT NOT NULL,
    "productIds" TEXT[],
    "supplierName" TEXT NOT NULL,
    "invoiceNumber" TEXT,
    "invoiceDate" DATE,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "content" BYTEA NOT NULL,
    "notes" TEXT,
    "uploadedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gst_supplier_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gst_classification_events" (
    "id" TEXT NOT NULL,
    "productId" TEXT,
    "mappingId" TEXT,
    "action" "GstClassificationAction" NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorName" TEXT,
    "approverName" TEXT,
    "reason" TEXT,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gst_classification_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gst_invoice_details" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "financialYear" TEXT NOT NULL,
    "invoiceDate" TIMESTAMP(3) NOT NULL,
    "kind" "GstInvoiceKind" NOT NULL,
    "supplier" JSONB NOT NULL,
    "recipient" JSONB NOT NULL,
    "supplierStateCode" TEXT NOT NULL,
    "placeOfSupplyCode" TEXT NOT NULL,
    "supplyType" "GstSupplyType" NOT NULL,
    "pricesIncludeTax" BOOLEAN NOT NULL,
    "lines" JSONB NOT NULL,
    "rateSummary" JSONB NOT NULL,
    "taxableCents" INTEGER NOT NULL,
    "cgstCents" INTEGER NOT NULL,
    "sgstCents" INTEGER NOT NULL,
    "igstCents" INTEGER NOT NULL,
    "cessCents" INTEGER NOT NULL DEFAULT 0,
    "totalTaxCents" INTEGER NOT NULL,
    "untaxedChargesCents" INTEGER NOT NULL DEFAULT 0,
    "invoiceValueCents" INTEGER NOT NULL,
    "reverseCharge" BOOLEAN NOT NULL DEFAULT false,
    "declarations" TEXT[],
    "auditId" TEXT,
    "eInvoiceStatus" "GstEInvoiceStatus" NOT NULL DEFAULT 'NOT_APPLICABLE',
    "irn" TEXT,
    "ackNumber" TEXT,
    "ackDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gst_invoice_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gst_credit_notes" (
    "id" TEXT NOT NULL,
    "creditNoteNumber" TEXT NOT NULL,
    "invoiceDetailId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "financialYear" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kind" "GstCreditKind" NOT NULL,
    "reason" TEXT NOT NULL,
    "lines" JSONB NOT NULL,
    "taxableCents" INTEGER NOT NULL,
    "cgstCents" INTEGER NOT NULL,
    "sgstCents" INTEGER NOT NULL,
    "igstCents" INTEGER NOT NULL,
    "cessCents" INTEGER NOT NULL DEFAULT 0,
    "totalTaxCents" INTEGER NOT NULL,
    "refundCents" INTEGER NOT NULL,
    "refundReference" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gst_credit_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gst_rate_proposals" (
    "id" TEXT NOT NULL,
    "notificationId" TEXT,
    "sourceUrl" TEXT,
    "title" TEXT NOT NULL,
    "noticeDate" DATE,
    "effectiveFrom" DATE,
    "proposedChange" JSONB NOT NULL,
    "summary" TEXT,
    "status" "GstProposalStatus" NOT NULL DEFAULT 'PROPOSED',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "createdRateId" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gst_rate_proposals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gst_source_watches" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "authority" TEXT NOT NULL DEFAULT 'CBIC',
    "lastCheckedAt" TIMESTAMP(3),
    "lastStatus" TEXT,
    "lastHash" TEXT,
    "lastChangedAt" TIMESTAMP(3),
    "changeAcknowledgedAt" TIMESTAMP(3),
    "changeAcknowledgedBy" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gst_source_watches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gst_return_reconciliations" (
    "id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "returnType" "GstReturnType" NOT NULL,
    "entered" JSONB NOT NULL,
    "computed" JSONB NOT NULL,
    "differences" JSONB NOT NULL,
    "status" "GstReconStatus" NOT NULL DEFAULT 'DRAFT',
    "note" TEXT,
    "enteredBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gst_return_reconciliations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gst_pending_catalog_items" (
    "id" TEXT NOT NULL,
    "kind" "GstPendingKind" NOT NULL,
    "name" TEXT NOT NULL,
    "categoryName" TEXT,
    "source" TEXT NOT NULL,
    "note" TEXT,
    "status" "GstPendingStatus" NOT NULL DEFAULT 'PENDING_IMPORT',
    "matchedProductId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gst_pending_catalog_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "gst_product_profiles_productId_key" ON "gst_product_profiles"("productId");

-- CreateIndex
CREATE INDEX "gst_product_profiles_infoStatus_idx" ON "gst_product_profiles"("infoStatus");

-- CreateIndex
CREATE INDEX "gst_supplier_documents_createdAt_idx" ON "gst_supplier_documents"("createdAt");

-- CreateIndex
CREATE INDEX "gst_classification_events_productId_createdAt_idx" ON "gst_classification_events"("productId", "createdAt");

-- CreateIndex
CREATE INDEX "gst_classification_events_mappingId_idx" ON "gst_classification_events"("mappingId");

-- CreateIndex
CREATE UNIQUE INDEX "gst_invoice_details_orderId_key" ON "gst_invoice_details"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "gst_invoice_details_invoiceNumber_key" ON "gst_invoice_details"("invoiceNumber");

-- CreateIndex
CREATE INDEX "gst_invoice_details_invoiceDate_idx" ON "gst_invoice_details"("invoiceDate");

-- CreateIndex
CREATE INDEX "gst_invoice_details_financialYear_idx" ON "gst_invoice_details"("financialYear");

-- CreateIndex
CREATE UNIQUE INDEX "gst_credit_notes_creditNoteNumber_key" ON "gst_credit_notes"("creditNoteNumber");

-- CreateIndex
CREATE INDEX "gst_credit_notes_invoiceDetailId_idx" ON "gst_credit_notes"("invoiceDetailId");

-- CreateIndex
CREATE INDEX "gst_credit_notes_orderId_idx" ON "gst_credit_notes"("orderId");

-- CreateIndex
CREATE INDEX "gst_credit_notes_issuedAt_idx" ON "gst_credit_notes"("issuedAt");

-- CreateIndex
CREATE INDEX "gst_rate_proposals_status_createdAt_idx" ON "gst_rate_proposals"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "gst_source_watches_url_key" ON "gst_source_watches"("url");

-- CreateIndex
CREATE INDEX "gst_return_reconciliations_period_returnType_idx" ON "gst_return_reconciliations"("period", "returnType");

-- CreateIndex
CREATE UNIQUE INDEX "gst_pending_catalog_items_kind_name_key" ON "gst_pending_catalog_items"("kind", "name");

-- AddForeignKey
ALTER TABLE "gst_credit_notes" ADD CONSTRAINT "gst_credit_notes_invoiceDetailId_fkey" FOREIGN KEY ("invoiceDetailId") REFERENCES "gst_invoice_details"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gst_rate_proposals" ADD CONSTRAINT "gst_rate_proposals_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "gst_notifications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

