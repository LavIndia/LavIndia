-- CreateEnum
CREATE TYPE "GstEngineMode" AS ENUM ('OFF', 'SHADOW', 'ENFORCE');

-- CreateEnum
CREATE TYPE "GstVerificationStatus" AS ENUM ('PENDING_VERIFICATION', 'VERIFIED');

-- CreateEnum
CREATE TYPE "GstRegistrationType" AS ENUM ('REGULAR', 'COMPOSITION', 'UNREGISTERED');

-- CreateEnum
CREATE TYPE "GstClassificationStatus" AS ENUM ('VERIFIED', 'NEEDS_ACCOUNTANT_APPROVAL', 'NEEDS_PRODUCT_INFORMATION');

-- CreateEnum
CREATE TYPE "GstChargeKind" AS ENUM ('PRODUCT', 'SHIPPING', 'COD_FEE');

-- CreateEnum
CREATE TYPE "GstRateApproval" AS ENUM ('DRAFT', 'APPROVED');

-- CreateEnum
CREATE TYPE "GstSupplyType" AS ENUM ('INTRA_STATE', 'INTER_STATE');

-- CreateEnum
CREATE TYPE "GstAuditOutcome" AS ENUM ('MATCHED', 'DIFFERS', 'MISSING_MAPPING', 'ERROR');

-- CreateTable
CREATE TABLE "gst_notifications" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "title" TEXT,
    "issuedOn" DATE,
    "effectiveFrom" DATE,
    "authority" TEXT NOT NULL DEFAULT 'CBIC',
    "sourceUrl" TEXT,
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gst_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gst_hsn_master" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gst_hsn_master_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gst_sac_master" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gst_sac_master_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gst_rate_master" (
    "id" TEXT NOT NULL,
    "hsnId" TEXT,
    "sacId" TEXT,
    "rateBps" INTEGER NOT NULL,
    "cgstBps" INTEGER NOT NULL,
    "sgstBps" INTEGER NOT NULL,
    "igstBps" INTEGER NOT NULL,
    "cessBps" INTEGER NOT NULL DEFAULT 0,
    "minUnitValueCents" INTEGER,
    "maxUnitValueCents" INTEGER,
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE,
    "notificationId" TEXT,
    "approval" "GstRateApproval" NOT NULL DEFAULT 'DRAFT',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "firstUsedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gst_rate_master_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gst_business_profile" (
    "id" TEXT NOT NULL,
    "legalName" TEXT,
    "tradeName" TEXT,
    "gstin" TEXT,
    "stateCode" TEXT,
    "stateName" TEXT,
    "registeredAddress" TEXT,
    "registrationType" "GstRegistrationType" NOT NULL DEFAULT 'REGULAR',
    "eInvoicingApplies" BOOLEAN,
    "verificationStatus" "GstVerificationStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "engineMode" "GstEngineMode" NOT NULL DEFAULT 'OFF',
    "engineModeChangedBy" TEXT,
    "engineModeChangedAt" TIMESTAMP(3),
    "enforceApprovedBy" TEXT,
    "enforceApprovedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gst_business_profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gst_product_mappings" (
    "id" TEXT NOT NULL,
    "chargeKind" "GstChargeKind" NOT NULL DEFAULT 'PRODUCT',
    "productId" TEXT,
    "variantId" TEXT,
    "hsnId" TEXT,
    "sacId" TEXT,
    "status" "GstClassificationStatus" NOT NULL DEFAULT 'NEEDS_PRODUCT_INFORMATION',
    "basis" TEXT,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gst_product_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gst_calculation_audits" (
    "id" TEXT NOT NULL,
    "orderId" TEXT,
    "orderNumber" TEXT,
    "mode" "GstEngineMode" NOT NULL,
    "channel" TEXT NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "engineVersion" TEXT NOT NULL,
    "outcome" "GstAuditOutcome" NOT NULL,
    "supplierStateCode" TEXT,
    "placeOfSupplyCode" TEXT,
    "supplyType" "GstSupplyType",
    "inputs" JSONB NOT NULL,
    "lines" JSONB NOT NULL,
    "missingMappings" JSONB,
    "rateVersionIds" TEXT[],
    "taxableCents" INTEGER NOT NULL,
    "cgstCents" INTEGER NOT NULL,
    "sgstCents" INTEGER NOT NULL,
    "igstCents" INTEGER NOT NULL,
    "cessCents" INTEGER NOT NULL DEFAULT 0,
    "totalTaxCents" INTEGER NOT NULL,
    "legacyTaxCents" INTEGER,
    "differenceCents" INTEGER,
    "errorMessage" TEXT,

    CONSTRAINT "gst_calculation_audits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "gst_notifications_number_issuedOn_key" ON "gst_notifications"("number", "issuedOn");

-- CreateIndex
CREATE UNIQUE INDEX "gst_hsn_master_code_key" ON "gst_hsn_master"("code");

-- CreateIndex
CREATE UNIQUE INDEX "gst_sac_master_code_key" ON "gst_sac_master"("code");

-- CreateIndex
CREATE INDEX "gst_rate_master_hsnId_effectiveFrom_idx" ON "gst_rate_master"("hsnId", "effectiveFrom");

-- CreateIndex
CREATE INDEX "gst_rate_master_sacId_effectiveFrom_idx" ON "gst_rate_master"("sacId", "effectiveFrom");

-- CreateIndex
CREATE INDEX "gst_rate_master_notificationId_idx" ON "gst_rate_master"("notificationId");

-- CreateIndex
CREATE UNIQUE INDEX "gst_business_profile_gstin_key" ON "gst_business_profile"("gstin");

-- CreateIndex
CREATE INDEX "gst_product_mappings_productId_effectiveFrom_idx" ON "gst_product_mappings"("productId", "effectiveFrom");

-- CreateIndex
CREATE INDEX "gst_product_mappings_variantId_idx" ON "gst_product_mappings"("variantId");

-- CreateIndex
CREATE INDEX "gst_product_mappings_chargeKind_effectiveFrom_idx" ON "gst_product_mappings"("chargeKind", "effectiveFrom");

-- CreateIndex
CREATE INDEX "gst_product_mappings_status_idx" ON "gst_product_mappings"("status");

-- CreateIndex
CREATE INDEX "gst_calculation_audits_orderId_idx" ON "gst_calculation_audits"("orderId");

-- CreateIndex
CREATE INDEX "gst_calculation_audits_calculatedAt_idx" ON "gst_calculation_audits"("calculatedAt");

-- CreateIndex
CREATE INDEX "gst_calculation_audits_outcome_calculatedAt_idx" ON "gst_calculation_audits"("outcome", "calculatedAt");

-- AddForeignKey
ALTER TABLE "gst_rate_master" ADD CONSTRAINT "gst_rate_master_hsnId_fkey" FOREIGN KEY ("hsnId") REFERENCES "gst_hsn_master"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gst_rate_master" ADD CONSTRAINT "gst_rate_master_sacId_fkey" FOREIGN KEY ("sacId") REFERENCES "gst_sac_master"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gst_rate_master" ADD CONSTRAINT "gst_rate_master_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "gst_notifications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gst_product_mappings" ADD CONSTRAINT "gst_product_mappings_hsnId_fkey" FOREIGN KEY ("hsnId") REFERENCES "gst_hsn_master"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gst_product_mappings" ADD CONSTRAINT "gst_product_mappings_sacId_fkey" FOREIGN KEY ("sacId") REFERENCES "gst_sac_master"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

