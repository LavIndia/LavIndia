-- AlterTable
ALTER TABLE "site_settings" ADD COLUMN     "expressShippingCents" INTEGER NOT NULL DEFAULT 19900,
ADD COLUMN     "standardShippingCents" INTEGER NOT NULL DEFAULT 9900;

