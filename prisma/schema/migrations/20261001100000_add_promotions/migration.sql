-- CreateEnum
CREATE TYPE "PromotionTrigger" AS ENUM ('AUTOMATIC', 'CODE');

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "promotionDiscountCents" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "appliedPromotions" JSONB;

-- AlterTable
ALTER TABLE "site_settings" ADD COLUMN     "onlinePricesIncludeGst" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "storePricesIncludeGst" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "promotions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "template" TEXT NOT NULL,
    "trigger" "PromotionTrigger" NOT NULL DEFAULT 'AUTOMATIC',
    "channels" "OrderSource"[] DEFAULT ARRAY['ONLINE', 'STORE']::"OrderSource"[],
    "pieces" JSONB NOT NULL DEFAULT '{"include":[],"exclude":[]}',
    "conditions" JSONB NOT NULL DEFAULT '[]',
    "benefit" JSONB NOT NULL,
    "minQuantity" INTEGER,
    "minSubtotalCents" INTEGER,
    "priceIncludesTax" BOOLEAN NOT NULL DEFAULT false,
    "maxApplicationsPerOrder" INTEGER,
    "maxDiscountCents" INTEGER,
    "usageLimit" INTEGER,
    "perCustomerLimit" INTEGER,
    "budgetCents" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "discountGivenCents" INTEGER NOT NULL DEFAULT 0,
    "combinesWithOtherClasses" BOOLEAN NOT NULL DEFAULT false,
    "exclusive" BOOLEAN NOT NULL DEFAULT false,
    "rank" INTEGER,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurrenceType" TEXT,
    "recurrenceDaysOfWeek" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "recurrenceDayOfMonth" INTEGER,
    "recurrenceStartTime" TEXT,
    "recurrenceEndTime" TEXT,
    "activatedAt" TIMESTAMP(3),
    "isPaused" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),
    "title" TEXT,
    "badge" TEXT,
    "nudgeText" TEXT,
    "appliedText" TEXT,
    "terms" TEXT,
    "invoiceLabel" TEXT,
    "showOnStorefront" BOOLEAN NOT NULL DEFAULT false,
    "slug" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promotions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promotion_codes" (
    "id" TEXT NOT NULL,
    "promotionId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "usageLimit" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promotion_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promotion_allocations" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "promotionId" TEXT,
    "code" TEXT,
    "label" TEXT NOT NULL,
    "applicationKey" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promotion_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "promotions_slug_key" ON "promotions"("slug");

-- CreateIndex
CREATE INDEX "promotions_archivedAt_isPaused_activatedAt_idx" ON "promotions"("archivedAt", "isPaused", "activatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "promotion_codes_code_key" ON "promotion_codes"("code");

-- CreateIndex
CREATE INDEX "promotion_codes_promotionId_idx" ON "promotion_codes"("promotionId");

-- CreateIndex
CREATE INDEX "promotion_allocations_promotionId_createdAt_idx" ON "promotion_allocations"("promotionId", "createdAt");

-- CreateIndex
CREATE INDEX "promotion_allocations_orderId_idx" ON "promotion_allocations"("orderId");

-- CreateIndex
CREATE INDEX "promotion_allocations_orderItemId_idx" ON "promotion_allocations"("orderItemId");

-- AddForeignKey
ALTER TABLE "promotion_codes" ADD CONSTRAINT "promotion_codes_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "promotions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_allocations" ADD CONSTRAINT "promotion_allocations_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_allocations" ADD CONSTRAINT "promotion_allocations_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "promotions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

