-- AlterTable
ALTER TABLE "product_variants" ADD COLUMN     "imageUrl" TEXT;

-- AlterTable
ALTER TABLE "site_settings" ALTER COLUMN "supportHoursEnd" SET DEFAULT '17:30',
ALTER COLUMN "supportHoursStart" SET DEFAULT '10:30';
