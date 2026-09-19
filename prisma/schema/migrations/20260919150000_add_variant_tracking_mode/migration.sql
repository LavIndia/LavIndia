-- CreateEnum
CREATE TYPE "StockTrackingMode" AS ENUM ('QUANTITY', 'SERIAL');

-- AlterTable
ALTER TABLE "product_variants" ADD COLUMN     "trackingMode" "StockTrackingMode" NOT NULL DEFAULT 'QUANTITY';

