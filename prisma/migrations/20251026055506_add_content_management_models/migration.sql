-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "featuredOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "isFeatured" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "site_settings" ADD COLUMN     "codAvailable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "copyrightText" TEXT NOT NULL DEFAULT '© 2025 Lavish India. All rights reserved.',
ADD COLUMN     "customerCount" TEXT NOT NULL DEFAULT '9L+',
ADD COLUMN     "metaDescription" TEXT,
ADD COLUMN     "metaKeywords" TEXT,
ADD COLUMN     "metaTitle" TEXT,
ADD COLUMN     "rating" TEXT NOT NULL DEFAULT '4.8',
ADD COLUMN     "supportHoursEnd" TEXT NOT NULL DEFAULT '5:30 PM',
ADD COLUMN     "supportHoursStart" TEXT NOT NULL DEFAULT '10:30 AM';

-- CreateTable
CREATE TABLE "promo_banners" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT,
    "message" TEXT NOT NULL,
    "bgColor" TEXT,
    "textColor" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promo_banners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budget_tiers" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "maxPrice" INTEGER NOT NULL,
    "gradient" TEXT NOT NULL,
    "icon" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "budget_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "homepage_sections" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "homepage_sections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "homepage_sections_name_key" ON "homepage_sections"("name");
